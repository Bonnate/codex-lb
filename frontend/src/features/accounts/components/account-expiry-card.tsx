import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountSummary } from "@/features/accounts/schemas";

export type AccountExpiryCardProps = {
  account: AccountSummary;
  busy: boolean;
  onSave: (accountId: string, expiresOn: string | null) => void;
};

export function AccountExpiryCard({
  account,
  busy,
  onSave,
}: AccountExpiryCardProps) {
  const [expiresOn, setExpiresOn] = useState(account.expiresOn ?? "");

  useEffect(() => {
    setExpiresOn(account.expiresOn ?? "");
  }, [account.accountId, account.expiresOn]);

  const currentValue = account.expiresOn ?? "";
  const dirty = expiresOn !== currentValue;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">계정 만료일</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            현재 설정: {account.expiresOn ?? "없음"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Input
          type="date"
          value={expiresOn}
          onChange={(event) => setExpiresOn(event.target.value)}
          disabled={busy}
          aria-label="계정 만료일"
        />
        <p className="text-xs text-muted-foreground">
          운영 메모용 날짜입니다. 계정 풀 제외에는 영향을 주지 않습니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onSave(account.accountId, expiresOn || null)}
          disabled={busy || !dirty}
        >
          저장
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => onSave(account.accountId, null)}
          disabled={busy || !currentValue}
        >
          해제
        </Button>
      </div>
    </div>
  );
}
