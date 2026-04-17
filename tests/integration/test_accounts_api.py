from __future__ import annotations

import base64
import io
import json
import zipfile

import pytest

from app.core.auth import generate_unique_account_id

pytestmark = pytest.mark.integration


def _encode_jwt(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    body = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    return f"header.{body}.sig"


@pytest.mark.asyncio
async def test_import_and_list_accounts(async_client):
    email = "tester@example.com"
    raw_account_id = "acc_explicit"
    payload = {
        "email": email,
        "chatgpt_account_id": "acc_payload",
        "https://api.openai.com/auth": {"chatgpt_plan_type": "plus"},
    }
    auth_json = {
        "tokens": {
            "idToken": _encode_jwt(payload),
            "accessToken": "access",
            "refreshToken": "refresh",
            "accountId": raw_account_id,
        },
    }

    expected_account_id = generate_unique_account_id(raw_account_id, email)
    files = {"auth_json": ("auth.json", json.dumps(auth_json), "application/json")}
    response = await async_client.post("/api/accounts/import", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["accounts"][0]["accountId"] == expected_account_id
    assert data["accounts"][0]["email"] == email
    assert data["accounts"][0]["planType"] == "plus"
    assert data["skippedCount"] == 0

    list_response = await async_client.get("/api/accounts")
    assert list_response.status_code == 200
    accounts = list_response.json()["accounts"]
    assert any(account["accountId"] == expected_account_id for account in accounts)


@pytest.mark.asyncio
async def test_reactivate_missing_account_returns_404(async_client):
    response = await async_client.post("/api/accounts/missing/reactivate")
    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "account_not_found"


@pytest.mark.asyncio
async def test_pause_missing_account_returns_404(async_client):
    response = await async_client.post("/api/accounts/missing/pause")
    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "account_not_found"


@pytest.mark.asyncio
async def test_pause_account(async_client):
    email = "pause@example.com"
    raw_account_id = "acc_pause"
    payload = {
        "email": email,
        "chatgpt_account_id": raw_account_id,
        "https://api.openai.com/auth": {"chatgpt_plan_type": "plus"},
    }
    auth_json = {
        "tokens": {
            "idToken": _encode_jwt(payload),
            "accessToken": "access",
            "refreshToken": "refresh",
            "accountId": raw_account_id,
        },
    }

    expected_account_id = generate_unique_account_id(raw_account_id, email)
    files = {"auth_json": ("auth.json", json.dumps(auth_json), "application/json")}
    response = await async_client.post("/api/accounts/import", files=files)
    assert response.status_code == 200

    pause = await async_client.post(f"/api/accounts/{expected_account_id}/pause")
    assert pause.status_code == 200
    assert pause.json()["status"] == "paused"

    accounts = await async_client.get("/api/accounts")
    assert accounts.status_code == 200
    data = accounts.json()["accounts"]
    matched = next((account for account in data if account["accountId"] == expected_account_id), None)
    assert matched is not None
    assert matched["status"] == "paused"


@pytest.mark.asyncio
async def test_delete_missing_account_returns_404(async_client):
    response = await async_client.delete("/api/accounts/missing")
    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "account_not_found"


@pytest.mark.asyncio
async def test_export_account_returns_auth_json(async_client):
    email = "export@example.com"
    raw_account_id = "acc_export"
    payload = {
        "email": email,
        "chatgpt_account_id": raw_account_id,
        "https://api.openai.com/auth": {"chatgpt_plan_type": "plus"},
    }
    auth_json = {
        "tokens": {
            "idToken": _encode_jwt(payload),
            "accessToken": "access-token",
            "refreshToken": "refresh-token",
            "accountId": raw_account_id,
        },
    }

    expected_account_id = generate_unique_account_id(raw_account_id, email)
    files = {"auth_json": ("auth.json", json.dumps(auth_json), "application/json")}
    response = await async_client.post("/api/accounts/import", files=files)
    assert response.status_code == 200

    export_response = await async_client.get(f"/api/accounts/{expected_account_id}/export")
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("application/json")
    assert export_response.headers["content-disposition"] == (
        f'attachment; filename="{expected_account_id}.auth.json"'
    )

    exported_payload = export_response.json()
    assert exported_payload["tokens"]["idToken"] == auth_json["tokens"]["idToken"]
    assert exported_payload["tokens"]["accessToken"] == auth_json["tokens"]["accessToken"]
    assert exported_payload["tokens"]["refreshToken"] == auth_json["tokens"]["refreshToken"]
    assert exported_payload["tokens"]["accountId"] == raw_account_id
    assert "lastRefreshAt" in exported_payload


@pytest.mark.asyncio
async def test_bulk_export_accounts_returns_zip_bundle(async_client):
    files = [
        (
            "auth_json",
            (
                "first.auth.json",
                json.dumps(
                    {
                        "tokens": {
                            "idToken": _encode_jwt(
                                {
                                    "email": "bulk-one@example.com",
                                    "chatgpt_account_id": "acc_bulk_one",
                                    "https://api.openai.com/auth": {"chatgpt_plan_type": "plus"},
                                }
                            ),
                            "accessToken": "access-one",
                            "refreshToken": "refresh-one",
                            "accountId": "acc_bulk_one",
                        },
                    }
                ),
                "application/json",
            ),
        ),
        (
            "auth_json",
            (
                "second.auth.json",
                json.dumps(
                    {
                        "tokens": {
                            "idToken": _encode_jwt(
                                {
                                    "email": "bulk-two@example.com",
                                    "chatgpt_account_id": "acc_bulk_two",
                                    "https://api.openai.com/auth": {"chatgpt_plan_type": "pro"},
                                }
                            ),
                            "accessToken": "access-two",
                            "refreshToken": "refresh-two",
                            "accountId": "acc_bulk_two",
                        },
                    }
                ),
                "application/json",
            ),
        ),
    ]
    response = await async_client.post("/api/accounts/import", files=files)
    assert response.status_code == 200

    account_ids = [account["accountId"] for account in response.json()["accounts"]]
    export_response = await async_client.post("/api/accounts/export", json={"accountIds": account_ids})
    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("application/zip")
    assert export_response.headers["content-disposition"] == 'attachment; filename="accounts-export.zip"'

    with zipfile.ZipFile(io.BytesIO(export_response.content)) as archive:
        names = sorted(archive.namelist())
        assert names == sorted([f"{account_id}.auth.json" for account_id in account_ids])
        first_payload = json.loads(archive.read(f"{account_ids[0]}.auth.json"))
        second_payload = json.loads(archive.read(f"{account_ids[1]}.auth.json"))

    assert first_payload["tokens"]["accessToken"] == "access-one"
    assert second_payload["tokens"]["accessToken"] == "access-two"


@pytest.mark.asyncio
async def test_bulk_export_without_account_ids_returns_400(async_client):
    response = await async_client.post("/api/accounts/export", json={"accountIds": []})
    assert response.status_code == 400
    payload = response.json()
    assert payload["error"]["code"] == "invalid_account_export_request"


@pytest.mark.asyncio
async def test_duplicate_import_is_ignored(async_client):
    email = "duplicate@example.com"
    raw_account_id = "acc_duplicate"
    auth_json = {
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

    files = {"auth_json": ("auth.json", json.dumps(auth_json), "application/json")}
    first = await async_client.post("/api/accounts/import", files=files)
    assert first.status_code == 200
    assert first.json()["skippedCount"] == 0

    second = await async_client.post("/api/accounts/import", files=files)
    assert second.status_code == 200
    payload = second.json()
    assert payload["accounts"] == []
    assert payload["skippedCount"] == 1

    accounts = await async_client.get("/api/accounts")
    assert accounts.status_code == 200
    assert len([account for account in accounts.json()["accounts"] if account["email"] == email]) == 1
