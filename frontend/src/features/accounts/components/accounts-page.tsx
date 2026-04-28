import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { AlertMessage } from "@/components/alert-message";
import { LoadingOverlay } from "@/components/layout/loading-overlay";
import { useDialogState } from "@/hooks/use-dialog-state";
import { AccountDetail } from "@/features/accounts/components/account-detail";
import { AccountList } from "@/features/accounts/components/account-list";
import { AccountsSkeleton } from "@/features/accounts/components/accounts-skeleton";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { useOauth } from "@/features/accounts/hooks/use-oauth";
import { getDefaultAccountExpiryDate } from "@/features/accounts/expiry";
import { buildDuplicateAccountIdSet } from "@/utils/account-identifiers";
import { getErrorMessageOrNull } from "@/utils/errors";

type OauthPurpose = "add" | "reauth";

const OauthDialog = lazy(() =>
  import("@/features/accounts/components/oauth-dialog").then((m) => ({ default: m.OauthDialog })),
);

export function AccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    accountsQuery,
    pauseMutation,
    resumeMutation,
    deleteMutation,
    expiryMutation,
  } = useAccounts();
  const oauth = useOauth();

  const oauthDialog = useDialogState();
  const deleteDialog = useDialogState<string>();
  const [oauthPurpose, setOauthPurpose] = useState<OauthPurpose>("add");
  const [oauthExpiresOn, setOauthExpiresOn] = useState(() => getDefaultAccountExpiryDate());

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const duplicateAccountIds = useMemo(() => buildDuplicateAccountIdSet(accounts), [accounts]);
  const selectedAccountId = searchParams.get("selected");

  const handleSelectAccount = useCallback((accountId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("selected", accountId);
    setSearchParams(nextSearchParams);
  }, [searchParams, setSearchParams]);

  const resolvedSelectedAccountId = useMemo(() => {
    if (accounts.length === 0) {
      return null;
    }
    if (selectedAccountId && accounts.some((account) => account.accountId === selectedAccountId)) {
      return selectedAccountId;
    }
    return accounts[0].accountId;
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () =>
      resolvedSelectedAccountId
        ? accounts.find((account) => account.accountId === resolvedSelectedAccountId) ?? null
        : null,
    [accounts, resolvedSelectedAccountId],
  );

  const mutationBusy =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    deleteMutation.isPending ||
    expiryMutation.isPending;

  const mutationError =
    getErrorMessageOrNull(pauseMutation.error) ||
    getErrorMessageOrNull(resumeMutation.error) ||
    getErrorMessageOrNull(deleteMutation.error) ||
    getErrorMessageOrNull(expiryMutation.error);

  const openOauthForAdd = useCallback(() => {
    setOauthPurpose("add");
    setOauthExpiresOn(getDefaultAccountExpiryDate());
    oauthDialog.show();
  }, [oauthDialog]);

  const openOauthForReauth = useCallback(() => {
    setOauthPurpose("reauth");
    oauthDialog.show();
  }, [oauthDialog]);

  const handleOauthComplete = useCallback(async () => {
    const existingAccountIds = new Set(accounts.map((account) => account.accountId));

    await oauth.complete();
    const result = await accountsQuery.refetch();

    if (oauthPurpose !== "add" || !oauthExpiresOn) {
      return;
    }

    const addedAccounts = (result.data ?? []).filter(
      (account) => !existingAccountIds.has(account.accountId),
    );
    if (addedAccounts.length === 0) {
      return;
    }

    try {
      await Promise.all(
        addedAccounts.map((account) =>
          expiryMutation.mutateAsync({
            accountId: account.accountId,
            expiresOn: oauthExpiresOn,
          }),
        ),
      );
      await accountsQuery.refetch();
    } catch {
      // Mutation-level error handling already shows the toast.
    }
  }, [accounts, accountsQuery, expiryMutation, oauth, oauthExpiresOn, oauthPurpose]);

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">계정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          가져온 계정과 인증 흐름을 관리합니다.
        </p>
      </div>

      {mutationError ? <AlertMessage variant="error">{mutationError}</AlertMessage> : null}

      {!accountsQuery.data ? (
        <AccountsSkeleton />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="rounded-xl border bg-card p-4">
            <AccountList
              accounts={accounts}
              selectedAccountId={resolvedSelectedAccountId}
              onSelect={handleSelectAccount}
              onOpenOauth={openOauthForAdd}
            />
          </div>

          <AccountDetail
            account={selectedAccount}
            showAccountId={selectedAccount ? duplicateAccountIds.has(selectedAccount.accountId) : false}
            busy={mutationBusy}
            onPause={(accountId) => void pauseMutation.mutateAsync(accountId)}
            onResume={(accountId) => void resumeMutation.mutateAsync(accountId)}
            onDelete={(accountId) => deleteDialog.show(accountId)}
            onUpdateExpiry={(accountId, expiresOn) => void expiryMutation.mutateAsync({ accountId, expiresOn })}
            onReauth={openOauthForReauth}
          />
        </div>
      )}

      <Suspense fallback={null}>
        <OauthDialog
          open={oauthDialog.open}
          state={oauth.state}
          onOpenChange={oauthDialog.onOpenChange}
          onStart={async (method) => {
            await oauth.start(method);
          }}
          onComplete={handleOauthComplete}
          onManualCallback={async (callbackUrl) => {
            await oauth.manualCallback(callbackUrl);
          }}
          onReset={oauth.reset}
          showExpiryInput={oauthPurpose === "add"}
          expiresOn={oauthExpiresOn}
          onExpiresOnChange={setOauthExpiresOn}
        />
      </Suspense>

      <ConfirmDialog
        open={deleteDialog.open}
        title="계정 삭제"
        description="이 작업은 로드밸런서 설정에서 계정을 제거합니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={() => {
          if (!deleteDialog.data) {
            return;
          }
          void deleteMutation.mutateAsync(deleteDialog.data).finally(() => {
            deleteDialog.hide();
          });
        }}
      />

      <LoadingOverlay visible={!!accountsQuery.data && mutationBusy} label="계정을 업데이트하는 중..." />
    </div>
  );
}
