from __future__ import annotations

import base64
import json

import pytest

from app.core.auth import fallback_account_id, generate_unique_account_id

pytestmark = pytest.mark.integration


def _encode_jwt(payload: dict[str, object]) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    body = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    return f"header.{body}.sig"


def _make_auth_json(account_id: str | None, email: str, plan_type: str = "plus") -> dict[str, object]:
    payload = {
        "email": email,
        "https://api.openai.com/auth": {"chatgpt_plan_type": plan_type},
    }
    if account_id:
        payload["chatgpt_account_id"] = account_id
    tokens: dict[str, object] = {
        "idToken": _encode_jwt(payload),
        "accessToken": "access",
        "refreshToken": "refresh",
    }
    if account_id:
        tokens["accountId"] = account_id
    return {"tokens": tokens}


async def _restore(async_client, payload: object):
    return await async_client.post(
        "/api/settings/restore",
        files={"backup_file": ("backup.json", json.dumps(payload), "application/json")},
    )


@pytest.mark.asyncio
async def test_restore_invalid_json_returns_400(async_client):
    response = await async_client.post(
        "/api/settings/restore",
        files={"backup_file": ("backup.json", "not-json", "application/json")},
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["error"]["code"] == "invalid_backup_payload"


@pytest.mark.asyncio
async def test_restore_missing_tokens_returns_400(async_client):
    response = await _restore(async_client, {"foo": "bar"})
    assert response.status_code == 400
    payload = response.json()
    assert payload["error"]["code"] == "invalid_backup_payload"


@pytest.mark.asyncio
async def test_restore_falls_back_to_email_based_account_id(async_client):
    email = "fallback@example.com"
    auth_json = _make_auth_json(None, email)
    response = await _restore(async_client, auth_json)
    assert response.status_code == 200

    accounts_response = await async_client.get("/api/accounts")
    assert accounts_response.status_code == 200
    accounts = accounts_response.json()["accounts"]
    matched = next((account for account in accounts if account["email"] == email), None)
    assert matched is not None
    assert matched["accountId"] == fallback_account_id(email)


@pytest.mark.asyncio
async def test_restore_requires_exactly_one_file(async_client):
    no_file = await async_client.post("/api/settings/restore", files={})
    assert no_file.status_code == 400
    assert no_file.json()["error"]["code"] == "invalid_backup_payload"

    two_files = await async_client.post(
        "/api/settings/restore",
        files=[
            (
                "backup_file",
                ("first.json", json.dumps(_make_auth_json("acc_one", "one@example.com")), "application/json"),
            ),
            (
                "backup_file",
                ("second.json", json.dumps(_make_auth_json("acc_two", "two@example.com")), "application/json"),
            ),
        ],
    )
    assert two_files.status_code == 400
    assert two_files.json()["error"]["code"] == "invalid_backup_payload"


@pytest.mark.asyncio
async def test_restore_skips_duplicate_account_in_backup_payload(async_client):
    email = "duplicate-backup@example.com"
    raw_account_id = "acc_duplicate_backup"
    account_id = generate_unique_account_id(raw_account_id, email)
    backup_payload = {
        "version": 1,
        "exportedAt": "2026-04-20T00:00:00Z",
        "accounts": [
            {
                "accountId": account_id,
                "chatgptAccountId": raw_account_id,
                "email": email,
                "planType": "plus",
                "status": "active",
                "deactivationReason": None,
                "resetAt": None,
                "blockedAt": None,
                "lastRefreshAt": "2026-04-20T00:00:00Z",
                "tokens": {
                    "idToken": _encode_jwt(
                        {
                            "email": email,
                            "chatgpt_account_id": raw_account_id,
                            "https://api.openai.com/auth": {"chatgpt_plan_type": "plus"},
                        }
                    ),
                    "accessToken": "access",
                    "refreshToken": "refresh",
                    "accountId": raw_account_id,
                },
            }
        ],
        "dashboardSettings": None,
        "dashboardAuth": None,
        "apiKeys": [],
    }

    first = await _restore(async_client, backup_payload)
    assert first.status_code == 200
    assert first.json()["accountsImported"] == 1

    second = await _restore(async_client, backup_payload)
    assert second.status_code == 200
    assert second.json()["accountsImported"] == 0
    assert second.json()["accountsSkipped"] == 1
