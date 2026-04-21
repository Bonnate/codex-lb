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


async def _restore_legacy_auth(async_client, *, account_id: str, email: str):
    return await async_client.post(
        "/api/settings/restore",
        files={
            "backup_file": (
                "auth.json",
                json.dumps(_make_auth_json(account_id, email)),
                "application/json",
            )
        },
    )


@pytest.mark.asyncio
async def test_settings_api_get_and_update(async_client):
    response = await async_client.get("/api/settings")
    assert response.status_code == 200
    payload = response.json()
    assert payload["stickyThreadsEnabled"] is True
    assert payload["upstreamStreamTransport"] == "default"
    assert payload["preferEarlierResetAccounts"] is True
    assert payload["routingStrategy"] == "capacity_weighted"
    assert payload["openaiCacheAffinityMaxAgeSeconds"] == 1800
    assert payload["httpResponsesSessionBridgePromptCacheIdleTtlSeconds"] == 3600
    assert payload["httpResponsesSessionBridgeGatewaySafeMode"] is False
    assert payload["stickyReallocationBudgetThresholdPct"] == 95.0
    assert payload["importWithoutOverwrite"] is True
    assert payload["totpRequiredOnLogin"] is False
    assert payload["totpConfigured"] is False
    assert payload["apiKeyAuthEnabled"] is False

    response = await async_client.put(
        "/api/settings",
        json={
            "stickyThreadsEnabled": False,
            "upstreamStreamTransport": "websocket",
            "preferEarlierResetAccounts": False,
            "routingStrategy": "round_robin",
            "openaiCacheAffinityMaxAgeSeconds": 180,
            "httpResponsesSessionBridgePromptCacheIdleTtlSeconds": 1800,
            "httpResponsesSessionBridgeGatewaySafeMode": True,
            "stickyReallocationBudgetThresholdPct": 90.0,
            "importWithoutOverwrite": False,
            "totpRequiredOnLogin": False,
            "apiKeyAuthEnabled": True,
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["stickyThreadsEnabled"] is False
    assert updated["upstreamStreamTransport"] == "websocket"
    assert updated["preferEarlierResetAccounts"] is False
    assert updated["routingStrategy"] == "round_robin"
    assert updated["openaiCacheAffinityMaxAgeSeconds"] == 180
    assert updated["httpResponsesSessionBridgePromptCacheIdleTtlSeconds"] == 1800
    assert updated["httpResponsesSessionBridgeGatewaySafeMode"] is True
    assert updated["stickyReallocationBudgetThresholdPct"] == 90.0
    assert updated["importWithoutOverwrite"] is False
    assert updated["totpRequiredOnLogin"] is False
    assert updated["totpConfigured"] is False
    assert updated["apiKeyAuthEnabled"] is True

    response = await async_client.get("/api/settings")
    assert response.status_code == 200
    payload = response.json()
    assert payload["stickyThreadsEnabled"] is False
    assert payload["upstreamStreamTransport"] == "websocket"
    assert payload["preferEarlierResetAccounts"] is False
    assert payload["routingStrategy"] == "round_robin"
    assert payload["openaiCacheAffinityMaxAgeSeconds"] == 180
    assert payload["httpResponsesSessionBridgePromptCacheIdleTtlSeconds"] == 1800
    assert payload["httpResponsesSessionBridgeGatewaySafeMode"] is True
    assert payload["stickyReallocationBudgetThresholdPct"] == 90.0
    assert payload["importWithoutOverwrite"] is False
    assert payload["totpRequiredOnLogin"] is False
    assert payload["totpConfigured"] is False
    assert payload["apiKeyAuthEnabled"] is True


@pytest.mark.asyncio
async def test_backup_and_restore_round_trip(async_client):
    raw_account_id = "acc_backup"
    email = "backup@example.com"
    expected_account_id = generate_unique_account_id(raw_account_id, email)

    restored = await _restore_legacy_auth(async_client, account_id=raw_account_id, email=email)
    assert restored.status_code == 200
    assert restored.json()["accountsImported"] == 1

    expiry_update = await async_client.put(
        f"/api/accounts/{expected_account_id}/expiry",
        json={"expiresOn": "2026-05-01"},
    )
    assert expiry_update.status_code == 200

    settings_update = await async_client.put(
        "/api/settings",
        json={
            "stickyThreadsEnabled": False,
            "upstreamStreamTransport": "websocket",
            "preferEarlierResetAccounts": False,
            "routingStrategy": "round_robin",
            "openaiCacheAffinityMaxAgeSeconds": 180,
            "httpResponsesSessionBridgePromptCacheIdleTtlSeconds": 1800,
            "httpResponsesSessionBridgeGatewaySafeMode": True,
            "stickyReallocationBudgetThresholdPct": 90.0,
            "importWithoutOverwrite": False,
            "totpRequiredOnLogin": False,
            "apiKeyAuthEnabled": True,
        },
    )
    assert settings_update.status_code == 200

    created_key = await async_client.post(
        "/api/api-keys/",
        json={
            "name": "backup-key",
            "allowedModels": ["gpt-5.2"],
            "assignedAccountIds": [expected_account_id],
            "limits": [
                {"limitType": "total_tokens", "limitWindow": "weekly", "maxValue": 12345},
            ],
        },
    )
    assert created_key.status_code == 200
    key_payload = created_key.json()
    key_id = key_payload["id"]

    backup_response = await async_client.get("/api/settings/backup")
    assert backup_response.status_code == 200
    assert backup_response.headers["content-type"].startswith("application/json")
    assert backup_response.headers["content-disposition"] == 'attachment; filename="codex-lb-backup.json"'
    backup_payload = backup_response.json()
    assert backup_payload["version"] == 1
    assert len(backup_payload["accounts"]) == 1
    assert backup_payload["accounts"][0]["accountId"] == expected_account_id
    assert backup_payload["accounts"][0]["expiresOn"] == "2026-05-01"
    assert backup_payload["accounts"][0]["tokens"]["accessToken"] == "access-token"
    assert backup_payload["dashboardSettings"]["apiKeyAuthEnabled"] is True
    assert len(backup_payload["apiKeys"]) == 1
    assert backup_payload["apiKeys"][0]["id"] == key_id

    deleted_account = await async_client.delete(f"/api/accounts/{expected_account_id}")
    assert deleted_account.status_code == 200
    deleted_key = await async_client.delete(f"/api/api-keys/{key_id}")
    assert deleted_key.status_code == 204

    settings_reset = await async_client.put(
        "/api/settings",
        json={
            "stickyThreadsEnabled": True,
            "upstreamStreamTransport": "default",
            "preferEarlierResetAccounts": True,
            "routingStrategy": "capacity_weighted",
            "openaiCacheAffinityMaxAgeSeconds": 300,
            "httpResponsesSessionBridgePromptCacheIdleTtlSeconds": 3600,
            "httpResponsesSessionBridgeGatewaySafeMode": False,
            "stickyReallocationBudgetThresholdPct": 95.0,
            "importWithoutOverwrite": True,
            "totpRequiredOnLogin": False,
            "apiKeyAuthEnabled": False,
        },
    )
    assert settings_reset.status_code == 200
    assert settings_reset.json()["apiKeyAuthEnabled"] is False

    restored_backup = await async_client.post(
        "/api/settings/restore",
        files={"backup_file": ("codex-lb-backup.json", json.dumps(backup_payload), "application/json")},
    )
    assert restored_backup.status_code == 200
    summary = restored_backup.json()
    assert summary == {
        "settingsApplied": True,
        "accountsImported": 1,
        "accountsSkipped": 0,
        "apiKeysImported": 1,
        "apiKeysSkipped": 0,
    }

    restored_settings = await async_client.get("/api/settings")
    assert restored_settings.status_code == 200
    assert restored_settings.json()["stickyThreadsEnabled"] is False
    assert restored_settings.json()["apiKeyAuthEnabled"] is True

    listed_accounts = await async_client.get("/api/accounts")
    assert listed_accounts.status_code == 200
    restored_account = next(
        (account for account in listed_accounts.json()["accounts"] if account["accountId"] == expected_account_id),
        None,
    )
    assert restored_account is not None
    assert restored_account["expiresOn"] == "2026-05-01"

    listed_keys = await async_client.get("/api/api-keys/")
    assert listed_keys.status_code == 200
    assert len(listed_keys.json()) == 1
    assert listed_keys.json()[0]["id"] == key_id


@pytest.mark.asyncio
async def test_restore_skips_duplicate_accounts_and_api_keys(async_client):
    raw_account_id = "acc_duplicate_restore"
    email = "duplicate-restore@example.com"
    expected_account_id = generate_unique_account_id(raw_account_id, email)

    await _restore_legacy_auth(async_client, account_id=raw_account_id, email=email)
    create_key = await async_client.post(
        "/api/api-keys/",
        json={"name": "duplicate-key", "assignedAccountIds": [expected_account_id]},
    )
    assert create_key.status_code == 200

    backup_response = await async_client.get("/api/settings/backup")
    assert backup_response.status_code == 200

    restored_backup = await async_client.post(
        "/api/settings/restore",
        files={"backup_file": ("codex-lb-backup.json", backup_response.text, "application/json")},
    )
    assert restored_backup.status_code == 200
    assert restored_backup.json() == {
        "settingsApplied": True,
        "accountsImported": 0,
        "accountsSkipped": 1,
        "apiKeysImported": 0,
        "apiKeysSkipped": 1,
    }
