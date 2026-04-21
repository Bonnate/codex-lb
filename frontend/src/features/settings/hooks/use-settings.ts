import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuthStore } from "@/features/auth/hooks/use-auth";
import { downloadBackup, getSettings, restoreBackup, updateSettings } from "@/features/settings/api";
import type { DashboardRestoreResponse, SettingsUpdateRequest } from "@/features/settings/schemas";

function triggerBrowserDownload(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

function invalidateDashboardQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["settings", "detail"] });
  void queryClient.invalidateQueries({ queryKey: ["accounts", "list"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
  void queryClient.invalidateQueries({ queryKey: ["api-keys", "list"] });
}

export function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["settings", "detail"],
    queryFn: getSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: SettingsUpdateRequest) => updateSettings(payload),
    onSuccess: () => {
      toast.success("설정을 저장했습니다");
      invalidateDashboardQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "설정을 저장하지 못했습니다");
    },
  });

  const downloadBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await downloadBackup();
      triggerBrowserDownload(response.blob, response.filename ?? "codex-lb-backup.json");
    },
    onSuccess: () => {
      toast.success("백업을 다운로드했습니다");
    },
    onError: (error: Error) => {
      toast.error(error.message || "백업을 다운로드하지 못했습니다");
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (file: File) => restoreBackup(file),
    onSuccess: async (response: DashboardRestoreResponse) => {
      invalidateDashboardQueries(queryClient);
      try {
        await useAuthStore.getState().refreshSession();
      } catch {
        // Restore may intentionally change auth requirements and invalidate the current session.
      }
      const importedSummary = [
        `계정 ${response.accountsImported}개 가져옴`,
        `계정 ${response.accountsSkipped}개 건너뜀`,
        `API 키 ${response.apiKeysImported}개 가져옴`,
        `API 키 ${response.apiKeysSkipped}개 건너뜀`,
      ].join(", ");
      toast.success(response.settingsApplied ? `백업 복원 완료: ${importedSummary}` : importedSummary);
    },
    onError: (error: Error) => {
      toast.error(error.message || "백업을 복원하지 못했습니다");
    },
  });

  return {
    settingsQuery,
    updateSettingsMutation,
    downloadBackupMutation,
    restoreBackupMutation,
  };
}
