import { Download, Pause, Play, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AccountSummary } from "@/features/accounts/schemas";

export type AccountActionsProps = {
  account: AccountSummary;
  busy: boolean;
  onPause: (accountId: string) => void;
  onResume: (accountId: string) => void;
  onExport: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onReauth: () => void;
};

export function AccountActions({
  account,
  busy,
  onPause,
  onResume,
  onExport,
  onDelete,
  onReauth,
}: AccountActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-t pt-4">
      {account.status === "paused" ? (
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onResume(account.accountId)}
          disabled={busy}
        >
          <Play className="h-3.5 w-3.5" />
          재개
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onPause(account.accountId)}
          disabled={busy}
        >
          <Pause className="h-3.5 w-3.5" />
          일시중지
        </Button>
      )}

      {account.status === "deactivated" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={onReauth}
          disabled={busy}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          다시 인증
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onExport(account.accountId)}
        disabled={busy}
      >
        <Download className="h-3.5 w-3.5" />
        내보내기
      </Button>

      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onDelete(account.accountId)}
        disabled={busy}
      >
        <Trash2 className="h-3.5 w-3.5" />
        삭제
      </Button>
    </div>
  );
}
