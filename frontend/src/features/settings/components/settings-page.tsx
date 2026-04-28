import { Suspense, lazy } from "react";
import { Settings } from "lucide-react";

import { AlertMessage } from "@/components/alert-message";
import { LoadingOverlay } from "@/components/layout/loading-overlay";
import { ApiKeysSection } from "@/features/api-keys/components/api-keys-section";
import { FirewallSection } from "@/features/firewall/components/firewall-section";
import { buildSettingsUpdateRequest } from "@/features/settings/payload";
import { AppearanceSettings } from "@/features/settings/components/appearance-settings";
import { BackupRestoreSettings } from "@/features/settings/components/backup-restore-settings";
import { PasswordSettings } from "@/features/settings/components/password-settings";
import { RoutingSettings } from "@/features/settings/components/routing-settings";
import { SettingsSkeleton } from "@/features/settings/components/settings-skeleton";
import { StickySessionsSection } from "@/features/sticky-sessions/components/sticky-sessions-section";
import { useAuthStore } from "@/features/auth/hooks/use-auth";
import { useSettings } from "@/features/settings/hooks/use-settings";
import type { SettingsUpdateRequest } from "@/features/settings/schemas";
import { getErrorMessageOrNull } from "@/utils/errors";

const TotpSettings = lazy(() =>
  import("@/features/settings/components/totp-settings").then((m) => ({ default: m.TotpSettings })),
);

export function SettingsPage() {
  const { settingsQuery, updateSettingsMutation, downloadBackupMutation, restoreBackupMutation } = useSettings();
  const authMode = useAuthStore((state) => state.authMode);
  const passwordManagementEnabled = useAuthStore((state) => state.passwordManagementEnabled);
  const passwordSessionActive = useAuthStore((state) => state.passwordSessionActive);

  const settings = settingsQuery.data;
  const busy =
    updateSettingsMutation.isPending || downloadBackupMutation.isPending || restoreBackupMutation.isPending;
  const error = getErrorMessageOrNull(settingsQuery.error) || getErrorMessageOrNull(updateSettingsMutation.error);
  const backupError =
    getErrorMessageOrNull(downloadBackupMutation.error) || getErrorMessageOrNull(restoreBackupMutation.error);

  const handleSave = async (payload: SettingsUpdateRequest) => {
    await updateSettingsMutation.mutateAsync(payload);
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Settings className="h-5 w-5 text-primary" />
          설정
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">라우팅, 인증, API 키 관리, 방화벽을 설정합니다.</p>
      </div>

      {!settings ? (
        <SettingsSkeleton />
      ) : (
        <>
          {error ? <AlertMessage variant="error">{error}</AlertMessage> : null}

          {authMode === "trusted_header" ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-foreground">
              대시보드 접근은 신뢰된 리버스 프록시 헤더로 인증됩니다. 비밀번호와 TOTP는 선택적 대체 로그인으로만 사용할 수 있습니다.
            </div>
          ) : null}

          {authMode === "disabled" ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-foreground">
              설정에 따라 대시보드 인증이 완전히 우회됩니다. 이 모드는 네트워크 제한이나 외부 접근 제어 뒤에서만 사용하세요.
            </div>
          ) : null}

          <div className="space-y-4">
            <AppearanceSettings settings={settings} busy={busy} onSave={handleSave} />
            <RoutingSettings
              key={settings.openaiCacheAffinityMaxAgeSeconds}
              settings={settings}
              busy={busy}
              onSave={handleSave}
            />
            <BackupRestoreSettings
              busy={busy}
              downloadBusy={downloadBackupMutation.isPending}
              restoreBusy={restoreBackupMutation.isPending}
              restoreResult={restoreBackupMutation.data}
              error={backupError}
              onDownload={async () => {
                await downloadBackupMutation.mutateAsync();
              }}
              onRestore={async (file) => {
                await restoreBackupMutation.mutateAsync(file);
              }}
            />
            <PasswordSettings disabled={busy} />
            {passwordManagementEnabled && passwordSessionActive ? (
              <Suspense fallback={null}>
                <TotpSettings settings={settings} disabled={busy} onSave={handleSave} />
              </Suspense>
            ) : null}

            <ApiKeysSection
              apiKeyAuthEnabled={settings.apiKeyAuthEnabled}
              disabled={busy}
              onApiKeyAuthEnabledChange={(enabled) =>
                void handleSave(buildSettingsUpdateRequest(settings, { apiKeyAuthEnabled: enabled }))
              }
            />
            <FirewallSection />
            <StickySessionsSection />
          </div>

          <LoadingOverlay visible={!!settings && busy} label="설정을 저장하는 중..." />
        </>
      )}
    </div>
  );
}
