import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AccountCard } from "@/features/dashboard/components/account-card";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { createAccountSummary } from "@/test/mocks/factories";

afterEach(() => {
  act(() => {
    usePrivacyStore.setState({ mode: "visible" });
  });
});

describe("AccountCard", () => {
  it("renders both 5h and weekly quota bars for regular accounts", () => {
    const account = createAccountSummary();
    render(<AccountCard account={account} />);

    expect(screen.getByText("플러스")).toBeInTheDocument();
    expect(screen.getByText("5시간")).toBeInTheDocument();
    expect(screen.getByText("주간")).toBeInTheDocument();
  });

  it("hides 5h quota bar for weekly-only accounts", () => {
    const account = createAccountSummary({
      planType: "free",
      usage: {
        primaryRemainingPercent: null,
        secondaryRemainingPercent: 76,
      },
      windowMinutesPrimary: null,
      windowMinutesSecondary: 10_080,
    });

    render(<AccountCard account={account} />);

    expect(screen.getByText("무료")).toBeInTheDocument();
    expect(screen.queryByText("5시간")).not.toBeInTheDocument();
    expect(screen.getByText("주간")).toBeInTheDocument();
  });

  it("blurs the dashboard card title when privacy mode is enabled", () => {
    act(() => {
      usePrivacyStore.setState({ mode: "blur" });
    });
    const account = createAccountSummary({
      displayName: "AWS Account MSP",
      email: "aws-account@example.com",
    });

    const { container } = render(<AccountCard account={account} />);

    expect(screen.getByText("AWS Account MSP")).toBeInTheDocument();
    expect(container.querySelector(".privacy-blur")).not.toBeNull();
  });

  it("shows only the first six account label characters in prefix privacy mode", () => {
    act(() => {
      usePrivacyStore.setState({ mode: "prefix" });
    });
    const account = createAccountSummary({
      displayName: "abcdefghi@example.com",
      email: "abcdefghi@example.com",
    });

    render(<AccountCard account={account} />);

    expect(screen.getByText("abcdef…")).toBeInTheDocument();
    expect(screen.queryByText("abcdefghi@example.com")).not.toBeInTheDocument();
  });
});
