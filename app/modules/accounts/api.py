from __future__ import annotations

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import Response

from app.core.audit.service import AuditService
from app.core.auth.dependencies import set_dashboard_error_format, validate_dashboard_session
from app.core.exceptions import DashboardBadRequestError, DashboardConflictError, DashboardNotFoundError
from app.dependencies import AccountsContext, get_accounts_context
from app.modules.accounts.repository import AccountIdentityConflictError
from app.modules.accounts.schemas import (
    AccountBulkExportRequest,
    AccountDeleteResponse,
    AccountImportResponse,
    AccountPauseResponse,
    AccountReactivateResponse,
    AccountsResponse,
    AccountTrendsResponse,
)
from app.modules.accounts.service import InvalidAccountExportRequestError, InvalidAuthJsonError

router = APIRouter(
    prefix="/api/accounts",
    tags=["dashboard"],
    dependencies=[Depends(validate_dashboard_session), Depends(set_dashboard_error_format)],
)


@router.get("", response_model=AccountsResponse)
async def list_accounts(
    context: AccountsContext = Depends(get_accounts_context),
) -> AccountsResponse:
    accounts = await context.service.list_accounts()
    return AccountsResponse(accounts=accounts)


@router.get("/{account_id}/trends", response_model=AccountTrendsResponse)
async def get_account_trends(
    account_id: str,
    context: AccountsContext = Depends(get_accounts_context),
) -> AccountTrendsResponse:
    result = await context.service.get_account_trends(account_id)
    if not result:
        raise DashboardNotFoundError("Account not found", code="account_not_found")
    return result


@router.post("/import", response_model=AccountImportResponse)
async def import_account(
    request: Request,
    auth_json: list[UploadFile] = File(...),
    context: AccountsContext = Depends(get_accounts_context),
) -> AccountImportResponse:
    raw_files = [await upload.read() for upload in auth_json]
    try:
        response = await context.service.import_accounts(raw_files)
        actor_ip = request.client.host if request.client else None
        for imported in response.accounts:
            AuditService.log_async(
                "account_created",
                actor_ip=actor_ip,
                details={"account_id": imported.account_id},
            )
        return response
    except InvalidAuthJsonError as exc:
        raise DashboardBadRequestError("Invalid auth.json payload", code="invalid_auth_json") from exc
    except AccountIdentityConflictError as exc:
        raise DashboardConflictError(str(exc), code="duplicate_identity_conflict") from exc


@router.post("/export")
async def export_accounts(
    request: Request,
    payload: AccountBulkExportRequest,
    context: AccountsContext = Depends(get_accounts_context),
) -> Response:
    try:
        exported = await context.service.export_accounts(payload.account_ids)
    except InvalidAccountExportRequestError as exc:
        raise DashboardBadRequestError(str(exc), code="invalid_account_export_request") from exc
    if exported is None:
        raise DashboardNotFoundError("Account not found", code="account_not_found")
    actor_ip = request.client.host if request.client else None
    for account_id in exported.account_ids:
        AuditService.log_async(
            "account_exported",
            actor_ip=actor_ip,
            details={"account_id": account_id},
        )
    return Response(
        content=exported.content,
        media_type=exported.media_type,
        headers={"Content-Disposition": f'attachment; filename="{exported.filename}"'},
    )


@router.get("/{account_id}/export")
async def export_account(
    request: Request,
    account_id: str,
    context: AccountsContext = Depends(get_accounts_context),
) -> Response:
    exported = await context.service.export_account(account_id)
    if exported is None:
        raise DashboardNotFoundError("Account not found", code="account_not_found")
    AuditService.log_async(
        "account_exported",
        actor_ip=request.client.host if request.client else None,
        details={"account_id": account_id},
    )
    return Response(
        content=exported.content,
        media_type=exported.media_type,
        headers={"Content-Disposition": f'attachment; filename="{exported.filename}"'},
    )


@router.post("/{account_id}/reactivate", response_model=AccountReactivateResponse)
async def reactivate_account(
    account_id: str,
    context: AccountsContext = Depends(get_accounts_context),
) -> AccountReactivateResponse:
    success = await context.service.reactivate_account(account_id)
    if not success:
        raise DashboardNotFoundError("Account not found", code="account_not_found")
    return AccountReactivateResponse(status="reactivated")


@router.post("/{account_id}/pause", response_model=AccountPauseResponse)
async def pause_account(
    account_id: str,
    context: AccountsContext = Depends(get_accounts_context),
) -> AccountPauseResponse:
    success = await context.service.pause_account(account_id)
    if not success:
        raise DashboardNotFoundError("Account not found", code="account_not_found")
    return AccountPauseResponse(status="paused")


@router.delete("/{account_id}", response_model=AccountDeleteResponse)
async def delete_account(
    request: Request,
    account_id: str,
    context: AccountsContext = Depends(get_accounts_context),
) -> AccountDeleteResponse:
    success = await context.service.delete_account(account_id)
    if not success:
        raise DashboardNotFoundError("Account not found", code="account_not_found")
    AuditService.log_async(
        "account_deleted",
        actor_ip=request.client.host if request.client else None,
        details={"account_id": account_id},
    )
    return AccountDeleteResponse(status="deleted")
