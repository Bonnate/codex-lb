import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteAccount,
  exportAccount,
  exportAccounts,
  getAccountTrends,
  importAccounts,
  listAccounts,
  pauseAccount,
  reactivateAccount,
} from "@/features/accounts/api";

function triggerBrowserDownload(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

function invalidateAccountRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["accounts", "list"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
}

/**
 * Account mutation actions without the polling query.
 * Use this when you need account actions but already have account data
 * from another source (e.g. the dashboard overview query).
 */
export function useAccountMutations() {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: importAccounts,
    onSuccess: (response) => {
      const importedCount = response.accounts.length;
      const skippedCount = response.skippedCount;
      if (importedCount > 0 && skippedCount > 0) {
        toast.success(`${importedCount}개 계정을 가져왔고, 중복 ${skippedCount}개는 건너뛰었습니다`);
      } else if (importedCount > 0) {
        toast.success(importedCount === 1 ? "계정을 가져왔습니다" : `${importedCount}개 계정을 가져왔습니다`);
      } else if (skippedCount > 0) {
        toast.success(`중복 계정 ${skippedCount}개를 건너뛰었습니다`);
      } else {
        toast.success("가져올 계정이 없습니다");
      }
      invalidateAccountRelatedQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "계정을 가져오지 못했습니다");
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await exportAccount(accountId);
      triggerBrowserDownload(response.blob, response.filename ?? `${accountId}.auth.json`);
    },
    onSuccess: () => {
      toast.success("계정을 내보냈습니다");
    },
    onError: (error: Error) => {
      toast.error(error.message || "계정을 내보내지 못했습니다");
    },
  });

  const bulkExportMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      const response = await exportAccounts(accountIds);
      triggerBrowserDownload(response.blob, response.filename ?? "accounts-export.zip");
      return accountIds;
    },
    onSuccess: (accountIds) => {
      toast.success(
        accountIds.length === 1 ? "계정을 내보냈습니다" : `${accountIds.length}개 계정을 내보냈습니다`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "계정을 내보내지 못했습니다");
    },
  });

  const pauseMutation = useMutation({
    mutationFn: pauseAccount,
    onSuccess: () => {
      toast.success("계정을 일시중지했습니다");
      invalidateAccountRelatedQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "계정을 일시중지하지 못했습니다");
    },
  });

  const resumeMutation = useMutation({
    mutationFn: reactivateAccount,
    onSuccess: () => {
      toast.success("계정을 다시 활성화했습니다");
      invalidateAccountRelatedQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "계정을 다시 활성화하지 못했습니다");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success("계정을 삭제했습니다");
      invalidateAccountRelatedQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "계정을 삭제하지 못했습니다");
    },
  });

  return { importMutation, exportMutation, bulkExportMutation, pauseMutation, resumeMutation, deleteMutation };
}

export function useAccountTrends(accountId: string | null) {
  return useQuery({
    queryKey: ["accounts", "trends", accountId],
    queryFn: () => getAccountTrends(accountId!),
    enabled: !!accountId,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useAccounts() {
  const accountsQuery = useQuery({
    queryKey: ["accounts", "list"],
    queryFn: listAccounts,
    select: (data) => data.accounts,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const mutations = useAccountMutations();

  return { accountsQuery, ...mutations };
}
