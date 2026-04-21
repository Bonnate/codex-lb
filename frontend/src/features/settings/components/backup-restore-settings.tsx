import { Download, Upload } from "lucide-react";
import { useId, useState, type ChangeEvent } from "react";

import { AlertMessage } from "@/components/alert-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardRestoreResponse } from "@/features/settings/schemas";

export type BackupRestoreSettingsProps = {
  busy: boolean;
  downloadBusy: boolean;
  restoreBusy: boolean;
  restoreResult: DashboardRestoreResponse | null | undefined;
  error: string | null;
  onDownload: () => Promise<void>;
  onRestore: (file: File) => Promise<void>;
};

export function BackupRestoreSettings({
  busy,
  downloadBusy,
  restoreBusy,
  restoreResult,
  error,
  onDownload,
  onRestore,
}: BackupRestoreSettingsProps) {
  const [file, setFile] = useState<File | null>(null);
  const inputId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const handleRestore = async () => {
    if (!file) {
      return;
    }
    await onRestore(file);
    setFile(null);
  };

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">백업 및 복원</h3>
            <p className="text-xs text-muted-foreground">
              계정, 설정, API 키를 단일 백업 파일로 내보내고 복원합니다.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-medium">백업 다운로드</p>
            <p className="text-xs text-muted-foreground">
              현재 계정 정보와 운영 설정을 하나의 JSON 파일로 저장합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={busy || downloadBusy}
            onClick={() => void onDownload()}
          >
            <Download className="h-4 w-4" />
            백업 다운로드
          </Button>
        </div>

        <div className="grid gap-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">백업 복원</p>
            <p className="text-xs text-muted-foreground">
              설정은 백업 값으로 덮어쓰고, 계정과 API 키는 중복을 건너뛰며 병합합니다.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="space-y-2">
              <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
                백업 파일
              </label>
              <Input
                id={inputId}
                type="file"
                accept="application/json,.json"
                disabled={busy || restoreBusy}
                onChange={handleChange}
              />
            </div>
            <Button
              type="button"
              className="gap-1.5"
              disabled={busy || restoreBusy || !file}
              onClick={() => void handleRestore()}
            >
              <Upload className="h-4 w-4" />
              복원
            </Button>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
            복원 후 서버 재시작은 필요하지 않습니다. 다음 요청부터 새 설정과 키 상태가 적용됩니다.
          </div>

          {restoreResult ? (
            <AlertMessage variant="success">
              설정 적용: {restoreResult.settingsApplied ? "예" : "아니오"} | 계정 {restoreResult.accountsImported}개
              가져옴 / {restoreResult.accountsSkipped}개 건너뜀 | API 키 {restoreResult.apiKeysImported}개
              가져옴 / {restoreResult.apiKeysSkipped}개 건너뜀
            </AlertMessage>
          ) : null}

          {error ? <AlertMessage variant="error">{error}</AlertMessage> : null}
        </div>
      </div>
    </section>
  );
}
