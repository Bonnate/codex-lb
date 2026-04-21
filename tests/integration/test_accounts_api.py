from __future__ import annotations

import base64
import json

import pytest

from app.core.auth import generate_unique_account_id

pytestmark = pytest.mark.integration


def _encode_jwt(payload: dict[str, object]) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    body = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    return f"header.{body}.sig"


def _make_auth_json(account_id: str, email: str) -> dict[str, object]:
    payload = {
        "email": email,
        "chatgpt_account_id": account_id,
        "https://api.openai.com/auth": {"chatgpt_plan_type": "plus"},
    }
    return {
        "tokens": {
            "idToken": _encode_jwt(payload),
            "accessToken": "access-token",
            "refreshToken": "refresh-token",
            "accountId": account_id,
        },
    }


async def _restore_legacy_auth(async_client, auth_json: dict[str, object]):
    return await async_client.post(
        "/api/settings/restore",
        files={"backup_file": ("auth.json", json.dumps(auth_json), "application/json")},
    )


@pytest.mark.asyncio
async def test_restore_legacy_auth_and_list_accounts(async_client):
    email = "tester@example.com"
    raw_account_id = "acc_explicit"
    expected_account_id = generate_unique_account_id(raw_account_id, email)

    response = await _restore_legacy_auth(async_client, _make_auth_json(raw_account_id, email))
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "settingsApplied": False,
        "accountsImported": 1,
        "accountsSkipped": 0,
        "apiKeysImported": 0,
        "apiKeysSkipped": 0,
    }

    list_response = await async_client.get("/api/accounts")
    assert list_response.status_code == 200
    accounts = list_response.json()["accounts"]
    matched = next((account for account in accounts if account["accountId"] == expected_account_id), None)
    assert matched is not None
    assert matched["email"] == email
    assert matched["planType"] == "plus"


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
    expected_account_id = generate_unique_account_id(raw_account_id, email)

    response = await _restore_legacy_auth(async_client, _make_auth_json(raw_account_id, email))
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
async def test_update_account_expiry(async_client):
    email = "expiry@example.com"
    raw_account_id = "acc_expiry"
    expected_account_id = generate_unique_account_id(raw_account_id, email)

    response = await _restore_legacy_auth(async_client, _make_auth_json(raw_account_id, email))
    assert response.status_code == 200

    update_response = await async_client.put(
        f"/api/accounts/{expected_account_id}/expiry",
        json={"expiresOn": "2026-05-01"},
    )
    assert update_response.status_code == 200
    assert update_response.json() == {
        "status": "updated",
        "expiresOn": "2026-05-01",
    }

    accounts = await async_client.get("/api/accounts")
    assert accounts.status_code == 200
    data = accounts.json()["accounts"]
    matched = next((account for account in data if account["accountId"] == expected_account_id), None)
    assert matched is not None
    assert matched["expiresOn"] == "2026-05-01"

    clear_response = await async_client.put(
        f"/api/accounts/{expected_account_id}/expiry",
        json={"expiresOn": None},
    )
    assert clear_response.status_code == 200
    assert clear_response.json() == {
        "status": "updated",
        "expiresOn": None,
    }

    accounts_after_clear = await async_client.get("/api/accounts")
    assert accounts_after_clear.status_code == 200
    cleared = next(
        (account for account in accounts_after_clear.json()["accounts"] if account["accountId"] == expected_account_id),
        None,
    )
    assert cleared is not None
    assert cleared["expiresOn"] is None


@pytest.mark.asyncio
async def test_update_missing_account_expiry_returns_404(async_client):
    response = await async_client.put("/api/accounts/missing/expiry", json={"expiresOn": "2026-05-01"})
    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "account_not_found"


@pytest.mark.asyncio
async def test_delete_missing_account_returns_404(async_client):
    response = await async_client.delete("/api/accounts/missing")
    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "account_not_found"


@pytest.mark.asyncio
async def test_duplicate_restore_is_ignored(async_client):
    email = "duplicate@example.com"
    raw_account_id = "acc_duplicate"
    auth_json = _make_auth_json(raw_account_id, email)

    first = await _restore_legacy_auth(async_client, auth_json)
    assert first.status_code == 200
    assert first.json()["accountsImported"] == 1
    assert first.json()["accountsSkipped"] == 0

    second = await _restore_legacy_auth(async_client, auth_json)
    assert second.status_code == 200
    payload = second.json()
    assert payload["accountsImported"] == 0
    assert payload["accountsSkipped"] == 1

    accounts = await async_client.get("/api/accounts")
    assert accounts.status_code == 200
    assert len([account for account in accounts.json()["accounts"] if account["email"] == email]) == 1


@pytest.mark.asyncio
async def test_legacy_account_import_export_routes_are_removed(async_client):
    restore = await _restore_legacy_auth(async_client, _make_auth_json("acc_removed", "removed@example.com"))
    assert restore.status_code == 200

    import_response = await async_client.post(
        "/api/accounts/import",
        files={
            "auth_json": (
                "auth.json",
                json.dumps(_make_auth_json("acc_old", "old@example.com")),
                "application/json",
            )
        },
    )
    assert import_response.status_code in {404, 405}

    export_many = await async_client.post("/api/accounts/export", json={"accountIds": ["acc_removed"]})
    assert export_many.status_code in {404, 405}

    export_one = await async_client.get("/api/accounts/acc_removed/export")
    assert export_one.status_code in {404, 405}
