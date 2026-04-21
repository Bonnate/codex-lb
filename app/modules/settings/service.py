from __future__ import annotations

import json
from dataclasses import dataclass

from pydantic import ValidationError

from app.core.auth import (
    DEFAULT_EMAIL,
    DEFAULT_PLAN,
    AuthFile,
    claims_from_auth,
    generate_unique_account_id,
    parse_auth_json,
)
from app.core.auth.api_key_cache import get_api_key_cache
from app.core.cache.invalidation import NAMESPACE_API_KEY, get_cache_invalidation_poller
from app.core.config.settings_cache import get_settings_cache
from app.core.crypto import TokenEncryptor
from app.core.plan_types import coerce_account_plan_type
from app.core.utils.time import to_utc_naive, utcnow
from app.db.models import Account, AccountStatus, ApiKey, ApiKeyLimit, LimitType, LimitWindow
from app.modules.accounts.repository import AccountsRepository
from app.modules.api_keys.repository import ApiKeysRepository
from app.modules.proxy.account_cache import get_account_selection_cache
from app.modules.settings.repository import SettingsRepository
from app.modules.settings.schemas import (
    DashboardBackupAccount,
    DashboardBackupAccountTokens,
    DashboardBackupApiKey,
    DashboardBackupApiKeyLimit,
    DashboardBackupAuth,
    DashboardBackupFile,
    DashboardBackupSettings,
)


@dataclass(frozen=True, slots=True)
class DashboardSettingsData:
    sticky_threads_enabled: bool
    upstream_stream_transport: str
    prefer_earlier_reset_accounts: bool
    routing_strategy: str
    openai_cache_affinity_max_age_seconds: int
    http_responses_session_bridge_prompt_cache_idle_ttl_seconds: int
    http_responses_session_bridge_gateway_safe_mode: bool
    sticky_reallocation_budget_threshold_pct: float
    import_without_overwrite: bool
    totp_required_on_login: bool
    totp_configured: bool
    api_key_auth_enabled: bool


@dataclass(frozen=True, slots=True)
class DashboardSettingsUpdateData:
    sticky_threads_enabled: bool
    upstream_stream_transport: str
    prefer_earlier_reset_accounts: bool
    routing_strategy: str
    openai_cache_affinity_max_age_seconds: int
    http_responses_session_bridge_prompt_cache_idle_ttl_seconds: int
    http_responses_session_bridge_gateway_safe_mode: bool
    sticky_reallocation_budget_threshold_pct: float
    import_without_overwrite: bool
    totp_required_on_login: bool
    api_key_auth_enabled: bool


@dataclass(frozen=True, slots=True)
class DashboardRestoreSummaryData:
    settings_applied: bool
    accounts_imported: int
    accounts_skipped: int
    api_keys_imported: int
    api_keys_skipped: int


class InvalidDashboardBackupError(ValueError):
    pass


class SettingsService:
    def __init__(
        self,
        repository: SettingsRepository,
        accounts_repository: AccountsRepository | None = None,
        api_keys_repository: ApiKeysRepository | None = None,
    ) -> None:
        self._repository = repository
        self._accounts_repository = accounts_repository
        self._api_keys_repository = api_keys_repository
        self._encryptor = TokenEncryptor()

    async def get_settings(self) -> DashboardSettingsData:
        row = await self._repository.get_or_create()
        return DashboardSettingsData(
            sticky_threads_enabled=row.sticky_threads_enabled,
            upstream_stream_transport=row.upstream_stream_transport,
            prefer_earlier_reset_accounts=row.prefer_earlier_reset_accounts,
            routing_strategy=row.routing_strategy,
            openai_cache_affinity_max_age_seconds=row.openai_cache_affinity_max_age_seconds,
            http_responses_session_bridge_prompt_cache_idle_ttl_seconds=(
                row.http_responses_session_bridge_prompt_cache_idle_ttl_seconds
            ),
            http_responses_session_bridge_gateway_safe_mode=row.http_responses_session_bridge_gateway_safe_mode,
            sticky_reallocation_budget_threshold_pct=row.sticky_reallocation_budget_threshold_pct,
            import_without_overwrite=row.import_without_overwrite,
            totp_required_on_login=row.totp_required_on_login,
            totp_configured=row.totp_secret_encrypted is not None,
            api_key_auth_enabled=row.api_key_auth_enabled,
        )

    async def update_settings(self, payload: DashboardSettingsUpdateData) -> DashboardSettingsData:
        current = await self._repository.get_or_create()
        if payload.totp_required_on_login and current.totp_secret_encrypted is None:
            raise ValueError("Configure TOTP before enabling login enforcement")
        row = await self._repository.update(
            sticky_threads_enabled=payload.sticky_threads_enabled,
            upstream_stream_transport=payload.upstream_stream_transport,
            prefer_earlier_reset_accounts=payload.prefer_earlier_reset_accounts,
            routing_strategy=payload.routing_strategy,
            openai_cache_affinity_max_age_seconds=payload.openai_cache_affinity_max_age_seconds,
            http_responses_session_bridge_prompt_cache_idle_ttl_seconds=(
                payload.http_responses_session_bridge_prompt_cache_idle_ttl_seconds
            ),
            http_responses_session_bridge_gateway_safe_mode=payload.http_responses_session_bridge_gateway_safe_mode,
            sticky_reallocation_budget_threshold_pct=payload.sticky_reallocation_budget_threshold_pct,
            import_without_overwrite=payload.import_without_overwrite,
            totp_required_on_login=payload.totp_required_on_login,
            api_key_auth_enabled=payload.api_key_auth_enabled,
        )
        return DashboardSettingsData(
            sticky_threads_enabled=row.sticky_threads_enabled,
            upstream_stream_transport=row.upstream_stream_transport,
            prefer_earlier_reset_accounts=row.prefer_earlier_reset_accounts,
            routing_strategy=row.routing_strategy,
            openai_cache_affinity_max_age_seconds=row.openai_cache_affinity_max_age_seconds,
            http_responses_session_bridge_prompt_cache_idle_ttl_seconds=(
                row.http_responses_session_bridge_prompt_cache_idle_ttl_seconds
            ),
            http_responses_session_bridge_gateway_safe_mode=row.http_responses_session_bridge_gateway_safe_mode,
            sticky_reallocation_budget_threshold_pct=row.sticky_reallocation_budget_threshold_pct,
            import_without_overwrite=row.import_without_overwrite,
            totp_required_on_login=row.totp_required_on_login,
            totp_configured=row.totp_secret_encrypted is not None,
            api_key_auth_enabled=row.api_key_auth_enabled,
        )

    async def export_backup(self) -> DashboardBackupFile:
        settings_row = await self._repository.get_or_create()
        accounts = await self._list_accounts()
        api_keys = await self._list_api_keys()
        return DashboardBackupFile(
            version=1,
            exported_at=utcnow(),
            accounts=[self._build_backup_account(account) for account in accounts],
            dashboard_settings=DashboardBackupSettings(
                sticky_threads_enabled=settings_row.sticky_threads_enabled,
                upstream_stream_transport=settings_row.upstream_stream_transport,
                prefer_earlier_reset_accounts=settings_row.prefer_earlier_reset_accounts,
                routing_strategy=settings_row.routing_strategy,
                openai_cache_affinity_max_age_seconds=settings_row.openai_cache_affinity_max_age_seconds,
                http_responses_session_bridge_prompt_cache_idle_ttl_seconds=(
                    settings_row.http_responses_session_bridge_prompt_cache_idle_ttl_seconds
                ),
                http_responses_session_bridge_gateway_safe_mode=(
                    settings_row.http_responses_session_bridge_gateway_safe_mode
                ),
                sticky_reallocation_budget_threshold_pct=settings_row.sticky_reallocation_budget_threshold_pct,
                import_without_overwrite=settings_row.import_without_overwrite,
                api_key_auth_enabled=settings_row.api_key_auth_enabled,
            ),
            dashboard_auth=DashboardBackupAuth(
                password_hash=settings_row.password_hash,
                totp_required_on_login=settings_row.totp_required_on_login,
                totp_secret=(
                    self._encryptor.decrypt(settings_row.totp_secret_encrypted)
                    if settings_row.totp_secret_encrypted is not None
                    else None
                ),
            ),
            api_keys=[self._build_backup_api_key(api_key) for api_key in api_keys],
        )

    async def restore_backup(self, raw: bytes) -> DashboardRestoreSummaryData:
        backup = self._parse_restore_payload(raw)
        settings_applied = await self._apply_backup_settings(backup)
        accounts_imported, accounts_skipped = await self._restore_accounts(backup.accounts)
        api_keys_imported, api_keys_skipped = await self._restore_api_keys(backup.api_keys)
        await get_settings_cache().invalidate()
        get_account_selection_cache().invalidate()
        get_api_key_cache().clear()
        poller = get_cache_invalidation_poller()
        if poller is not None:
            await poller.bump(NAMESPACE_API_KEY)
        return DashboardRestoreSummaryData(
            settings_applied=settings_applied,
            accounts_imported=accounts_imported,
            accounts_skipped=accounts_skipped,
            api_keys_imported=api_keys_imported,
            api_keys_skipped=api_keys_skipped,
        )

    async def _list_accounts(self) -> list[Account]:
        if self._accounts_repository is None:
            return []
        return await self._accounts_repository.list_accounts()

    async def _list_api_keys(self) -> list[ApiKey]:
        if self._api_keys_repository is None:
            return []
        return await self._api_keys_repository.list_all()

    def _build_backup_account(self, account: Account) -> DashboardBackupAccount:
        return DashboardBackupAccount(
            account_id=account.id,
            chatgpt_account_id=account.chatgpt_account_id,
            email=account.email,
            plan_type=account.plan_type,
            status=account.status.value,
            deactivation_reason=account.deactivation_reason,
            reset_at=account.reset_at,
            blocked_at=account.blocked_at,
            expires_on=account.expires_on,
            last_refresh_at=account.last_refresh,
            tokens=DashboardBackupAccountTokens(
                idToken=self._encryptor.decrypt(account.id_token_encrypted),
                accessToken=self._encryptor.decrypt(account.access_token_encrypted),
                refreshToken=self._encryptor.decrypt(account.refresh_token_encrypted),
                accountId=account.chatgpt_account_id,
            ),
        )

    def _build_backup_api_key(self, api_key: ApiKey) -> DashboardBackupApiKey:
        return DashboardBackupApiKey(
            id=api_key.id,
            name=api_key.name,
            key_hash=api_key.key_hash,
            key_prefix=api_key.key_prefix,
            allowed_models=_deserialize_allowed_models(api_key.allowed_models),
            enforced_model=api_key.enforced_model,
            enforced_reasoning_effort=api_key.enforced_reasoning_effort,
            enforced_service_tier=api_key.enforced_service_tier,
            expires_at=api_key.expires_at,
            is_active=api_key.is_active,
            account_assignment_scope_enabled=api_key.account_assignment_scope_enabled,
            assigned_account_ids=sorted(
                assignment.account_id for assignment in getattr(api_key, "account_assignments", [])
            ),
            created_at=api_key.created_at,
            last_used_at=api_key.last_used_at,
            limits=[
                DashboardBackupApiKeyLimit(
                    limit_type=limit.limit_type.value,
                    limit_window=limit.limit_window.value,
                    max_value=limit.max_value,
                    current_value=limit.current_value,
                    model_filter=limit.model_filter,
                    reset_at=limit.reset_at,
                )
                for limit in getattr(api_key, "limits", [])
            ],
        )

    def _parse_restore_payload(self, raw: bytes) -> DashboardBackupFile:
        try:
            return DashboardBackupFile.model_validate_json(raw)
        except ValidationError:
            pass

        try:
            auth = parse_auth_json(raw)
        except Exception as exc:
            raise InvalidDashboardBackupError("Invalid backup payload") from exc
        return self._build_legacy_backup(auth)

    def _build_legacy_backup(self, auth: AuthFile) -> DashboardBackupFile:
        claims = claims_from_auth(auth)
        email = claims.email or DEFAULT_EMAIL
        raw_account_id = claims.account_id
        account_id = generate_unique_account_id(raw_account_id, email)
        return DashboardBackupFile(
            version=1,
            exported_at=utcnow(),
            accounts=[
                DashboardBackupAccount(
                    account_id=account_id,
                    chatgpt_account_id=raw_account_id,
                    email=email,
                    plan_type=coerce_account_plan_type(claims.plan_type, DEFAULT_PLAN),
                    status=AccountStatus.ACTIVE.value,
                    deactivation_reason=None,
                    reset_at=None,
                    blocked_at=None,
                    expires_on=None,
                    last_refresh_at=auth.last_refresh_at,
                    tokens=DashboardBackupAccountTokens(
                        idToken=auth.tokens.id_token,
                        accessToken=auth.tokens.access_token,
                        refreshToken=auth.tokens.refresh_token,
                        accountId=auth.tokens.account_id,
                    ),
                )
            ],
            dashboard_settings=None,
            dashboard_auth=None,
            api_keys=[],
        )

    async def _apply_backup_settings(self, backup: DashboardBackupFile) -> bool:
        settings_applied = False
        if backup.dashboard_settings is not None:
            await self._repository.update(
                sticky_threads_enabled=backup.dashboard_settings.sticky_threads_enabled,
                upstream_stream_transport=backup.dashboard_settings.upstream_stream_transport,
                prefer_earlier_reset_accounts=backup.dashboard_settings.prefer_earlier_reset_accounts,
                routing_strategy=backup.dashboard_settings.routing_strategy,
                openai_cache_affinity_max_age_seconds=backup.dashboard_settings.openai_cache_affinity_max_age_seconds,
                http_responses_session_bridge_prompt_cache_idle_ttl_seconds=(
                    backup.dashboard_settings.http_responses_session_bridge_prompt_cache_idle_ttl_seconds
                ),
                http_responses_session_bridge_gateway_safe_mode=(
                    backup.dashboard_settings.http_responses_session_bridge_gateway_safe_mode
                ),
                sticky_reallocation_budget_threshold_pct=(
                    backup.dashboard_settings.sticky_reallocation_budget_threshold_pct
                ),
                import_without_overwrite=backup.dashboard_settings.import_without_overwrite,
                api_key_auth_enabled=backup.dashboard_settings.api_key_auth_enabled,
            )
            settings_applied = True

        if backup.dashboard_auth is not None:
            row = await self._repository.get_or_create()
            row.password_hash = backup.dashboard_auth.password_hash
            row.totp_required_on_login = backup.dashboard_auth.totp_required_on_login
            row.totp_secret_encrypted = (
                self._encryptor.encrypt(backup.dashboard_auth.totp_secret)
                if backup.dashboard_auth.totp_secret is not None
                else None
            )
            row.totp_last_verified_step = None
            row.bootstrap_token_encrypted = None
            row.bootstrap_token_hash = None
            await self._repository.commit_refresh(row)
            settings_applied = True

        return settings_applied

    async def _restore_accounts(self, accounts: list[DashboardBackupAccount]) -> tuple[int, int]:
        if self._accounts_repository is None:
            return (0, len(accounts))

        imported = 0
        skipped = 0
        for backup_account in accounts:
            normalized_account_id = generate_unique_account_id(
                backup_account.chatgpt_account_id,
                backup_account.email,
            )
            existing = await self._accounts_repository.get_by_id(backup_account.account_id)
            if existing is None and normalized_account_id != backup_account.account_id:
                existing = await self._accounts_repository.get_by_id(normalized_account_id)
            if existing is not None:
                skipped += 1
                continue
            account = Account(
                id=backup_account.account_id,
                chatgpt_account_id=backup_account.chatgpt_account_id,
                email=backup_account.email,
                plan_type=backup_account.plan_type,
                access_token_encrypted=self._encryptor.encrypt(backup_account.tokens.access_token),
                refresh_token_encrypted=self._encryptor.encrypt(backup_account.tokens.refresh_token),
                id_token_encrypted=self._encryptor.encrypt(backup_account.tokens.id_token),
                last_refresh=(
                    to_utc_naive(backup_account.last_refresh_at)
                    if backup_account.last_refresh_at
                    else utcnow()
                ),
                status=AccountStatus(backup_account.status),
                deactivation_reason=backup_account.deactivation_reason,
                reset_at=backup_account.reset_at,
                blocked_at=backup_account.blocked_at,
                expires_on=backup_account.expires_on,
            )
            await self._accounts_repository.upsert(account, merge_by_email=False)
            imported += 1
        return (imported, skipped)

    async def _restore_api_keys(self, api_keys: list[DashboardBackupApiKey]) -> tuple[int, int]:
        if self._api_keys_repository is None:
            return (0, len(api_keys))

        imported = 0
        skipped = 0
        for backup_api_key in api_keys:
            existing_by_id = await self._api_keys_repository.get_by_id(backup_api_key.id)
            existing_by_hash = await self._api_keys_repository.get_by_hash(backup_api_key.key_hash)
            if existing_by_id is not None or existing_by_hash is not None:
                skipped += 1
                continue

            if backup_api_key.assigned_account_ids:
                existing_accounts = await self._api_keys_repository.list_accounts_by_ids(
                    backup_api_key.assigned_account_ids
                )
                existing_account_ids = {account.id for account in existing_accounts}
                missing_account_ids = [
                    account_id
                    for account_id in backup_api_key.assigned_account_ids
                    if account_id not in existing_account_ids
                ]
                if missing_account_ids:
                    missing = ", ".join(missing_account_ids)
                    raise InvalidDashboardBackupError(f"Unknown assigned account ids in backup: {missing}")

            created = await self._api_keys_repository.create(
                ApiKey(
                    id=backup_api_key.id,
                    name=backup_api_key.name,
                    key_hash=backup_api_key.key_hash,
                    key_prefix=backup_api_key.key_prefix,
                    allowed_models=_serialize_allowed_models(backup_api_key.allowed_models),
                    enforced_model=backup_api_key.enforced_model,
                    enforced_reasoning_effort=backup_api_key.enforced_reasoning_effort,
                    enforced_service_tier=_normalize_service_tier(backup_api_key.enforced_service_tier),
                    account_assignment_scope_enabled=backup_api_key.account_assignment_scope_enabled,
                    expires_at=to_utc_naive(backup_api_key.expires_at) if backup_api_key.expires_at else None,
                    is_active=backup_api_key.is_active,
                    created_at=to_utc_naive(backup_api_key.created_at),
                    last_used_at=to_utc_naive(backup_api_key.last_used_at) if backup_api_key.last_used_at else None,
                )
            )
            limit_rows = [
                ApiKeyLimit(
                    api_key_id=created.id,
                    limit_type=LimitType(limit.limit_type),
                    limit_window=LimitWindow(limit.limit_window),
                    max_value=limit.max_value,
                    current_value=limit.current_value,
                    model_filter=limit.model_filter,
                    reset_at=to_utc_naive(limit.reset_at),
                )
                for limit in backup_api_key.limits
            ]
            await self._api_keys_repository.replace_limits(created.id, limit_rows)
            await self._api_keys_repository.replace_account_assignments(
                created.id,
                backup_api_key.assigned_account_ids,
            )
            imported += 1
        return (imported, skipped)


def _deserialize_allowed_models(payload: str | None) -> list[str] | None:
    if payload is None:
        return None
    parsed = json.loads(payload)
    if not isinstance(parsed, list):
        raise InvalidDashboardBackupError("Invalid allowed_models payload")
    return [str(value) for value in parsed]


def _serialize_allowed_models(allowed_models: list[str] | None) -> str | None:
    if allowed_models is None:
        return None
    return json.dumps(allowed_models)


def _normalize_service_tier(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    if normalized == "fast":
        return "priority"
    return normalized
