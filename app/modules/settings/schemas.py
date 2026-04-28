from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import Field

from app.modules.shared.schemas import DashboardModel


class DashboardSettingsResponse(DashboardModel):
    sticky_threads_enabled: bool
    upstream_stream_transport: str = Field(pattern=r"^(default|auto|http|websocket)$")
    prefer_earlier_reset_accounts: bool
    routing_strategy: str = Field(pattern=r"^(usage_weighted|round_robin|capacity_weighted)$")
    openai_cache_affinity_max_age_seconds: int = Field(gt=0)
    http_responses_session_bridge_prompt_cache_idle_ttl_seconds: int = Field(gt=0)
    http_responses_session_bridge_gateway_safe_mode: bool
    sticky_reallocation_budget_threshold_pct: float = Field(ge=0.0, le=100.0)
    import_without_overwrite: bool
    totp_required_on_login: bool
    totp_configured: bool
    api_key_auth_enabled: bool
    display_cost_currency: str = Field(min_length=3, max_length=3, pattern=r"^[A-Z]{3}$")
    cost_fx_rates: dict[str, float] = Field(default_factory=dict)
    cost_fx_rate_date: str | None = None
    cost_fx_fetched_at: datetime | None = None


class DashboardSettingsUpdateRequest(DashboardModel):
    sticky_threads_enabled: bool
    upstream_stream_transport: str | None = Field(
        default=None,
        pattern=r"^(default|auto|http|websocket)$",
    )
    prefer_earlier_reset_accounts: bool
    routing_strategy: str | None = Field(default=None, pattern=r"^(usage_weighted|round_robin|capacity_weighted)$")
    openai_cache_affinity_max_age_seconds: int | None = Field(default=None, gt=0)
    http_responses_session_bridge_prompt_cache_idle_ttl_seconds: int | None = Field(default=None, gt=0)
    http_responses_session_bridge_gateway_safe_mode: bool | None = None
    sticky_reallocation_budget_threshold_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    import_without_overwrite: bool | None = None
    totp_required_on_login: bool | None = None
    api_key_auth_enabled: bool | None = None
    display_cost_currency: str | None = Field(default=None, min_length=3, max_length=3, pattern=r"^[A-Za-z]{3}$")


class RuntimeConnectAddressResponse(DashboardModel):
    connect_address: str


class DashboardBackupSettings(DashboardModel):
    sticky_threads_enabled: bool
    upstream_stream_transport: str = Field(pattern=r"^(default|auto|http|websocket)$")
    prefer_earlier_reset_accounts: bool
    routing_strategy: str = Field(pattern=r"^(usage_weighted|round_robin|capacity_weighted)$")
    openai_cache_affinity_max_age_seconds: int = Field(gt=0)
    http_responses_session_bridge_prompt_cache_idle_ttl_seconds: int = Field(gt=0)
    http_responses_session_bridge_gateway_safe_mode: bool
    sticky_reallocation_budget_threshold_pct: float = Field(ge=0.0, le=100.0)
    import_without_overwrite: bool
    api_key_auth_enabled: bool
    display_cost_currency: str = Field(default="USD", min_length=3, max_length=3, pattern=r"^[A-Za-z]{3}$")


class DashboardBackupAuth(DashboardModel):
    password_hash: str | None = None
    totp_required_on_login: bool
    totp_secret: str | None = None


class DashboardBackupAccountTokens(DashboardModel):
    id_token: str = Field(alias="idToken")
    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    account_id: str | None = Field(default=None, alias="accountId")


class DashboardBackupAccount(DashboardModel):
    account_id: str
    chatgpt_account_id: str | None = None
    email: str
    plan_type: str
    status: str = Field(pattern=r"^(active|rate_limited|quota_exceeded|paused|deactivated)$")
    deactivation_reason: str | None = None
    reset_at: int | None = None
    blocked_at: int | None = None
    expires_on: date | None = None
    last_refresh_at: datetime | None = None
    tokens: DashboardBackupAccountTokens


class DashboardBackupApiKeyLimit(DashboardModel):
    limit_type: str = Field(pattern=r"^(total_tokens|input_tokens|output_tokens|cost_usd|credits)$")
    limit_window: str = Field(pattern=r"^(daily|weekly|monthly|5h|7d)$")
    max_value: int = Field(ge=0)
    current_value: int = Field(ge=0)
    model_filter: str | None = None
    reset_at: datetime


class DashboardBackupApiKey(DashboardModel):
    id: str
    name: str = Field(min_length=1, max_length=128)
    key_hash: str
    key_prefix: str
    allowed_models: list[str] | None = None
    enforced_model: str | None = None
    enforced_reasoning_effort: str | None = Field(default=None, pattern=r"(?i)^(none|minimal|low|medium|high|xhigh)$")
    enforced_service_tier: str | None = Field(default=None, pattern=r"(?i)^(auto|default|priority|flex|fast)$")
    expires_at: datetime | None = None
    is_active: bool
    account_assignment_scope_enabled: bool = False
    assigned_account_ids: list[str] = Field(default_factory=list)
    created_at: datetime
    last_used_at: datetime | None = None
    limits: list[DashboardBackupApiKeyLimit] = Field(default_factory=list)


class DashboardBackupFile(DashboardModel):
    version: Literal[1]
    exported_at: datetime
    accounts: list[DashboardBackupAccount] = Field(default_factory=list)
    dashboard_settings: DashboardBackupSettings | None = None
    dashboard_auth: DashboardBackupAuth | None = None
    api_keys: list[DashboardBackupApiKey] = Field(default_factory=list)


class DashboardRestoreResponse(DashboardModel):
    settings_applied: bool
    accounts_imported: int = Field(ge=0)
    accounts_skipped: int = Field(ge=0)
    api_keys_imported: int = Field(ge=0)
    api_keys_skipped: int = Field(ge=0)
