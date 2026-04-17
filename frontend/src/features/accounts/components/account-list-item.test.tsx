import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccountListItem } from "@/features/accounts/components/account-list-item";
import { createAccountSummary } from "@/test/mocks/factories";

describe("AccountListItem", () => {
  it("renders neutral quota track when secondary remaining percent is unknown", () => {
    const account = createAccountSummary({
      usage: {
        primaryRemainingPercent: 82,
        secondaryRemainingPercent: null,
      },
    });

    render(<AccountListItem account={account} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByTestId("mini-quota-track")).toHaveClass("bg-muted");
    expect(screen.queryByTestId("mini-quota-fill")).not.toBeInTheDocument();
  });

  it("renders quota fill when secondary remaining percent is available", () => {
    const account = createAccountSummary({
      usage: {
        primaryRemainingPercent: 82,
        secondaryRemainingPercent: 73,
      },
    });

    render(<AccountListItem account={account} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByTestId("mini-quota-fill")).toHaveStyle({ width: "73%" });
  });

  it("toggles bulk export selection", async () => {
    const user = userEvent.setup();
    const account = createAccountSummary();
    const onToggleExportSelection = vi.fn();

    render(
      <AccountListItem
        account={account}
        selected={false}
        exportSelected={false}
        onSelect={vi.fn()}
        onToggleExportSelection={onToggleExportSelection}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: `${account.accountId} 내보내기 선택` }));
    expect(onToggleExportSelection).toHaveBeenCalledWith(account.accountId, true);
  });
});
