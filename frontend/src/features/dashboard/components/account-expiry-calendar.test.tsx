import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AccountExpiryCalendar } from "@/features/dashboard/components/account-expiry-calendar";
import { useCalendarTimeZoneStore } from "@/hooks/use-calendar-time-zone";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { createAccountSummary } from "@/test/mocks/factories";

afterEach(() => {
  act(() => {
    usePrivacyStore.setState({ mode: "visible" });
    useCalendarTimeZoneStore.setState({ timeZone: "Asia/Seoul" });
  });
  if (typeof window.localStorage?.clear === "function") {
    window.localStorage.clear();
  }
});

describe("AccountExpiryCalendar", () => {
  it("shows an empty state when no account has a visible schedule", () => {
    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({ accountId: "acc-1", expiresOn: null, resetAtSecondary: null }),
          createAccountSummary({ accountId: "acc-2", expiresOn: undefined, resetAtSecondary: null }),
        ]}
      />,
    );

    expect(screen.getByText("표시할 계정 일정이 없습니다.")).toBeInTheDocument();
  });

  it("renders account expirations on the matching day", () => {
    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-expiring",
            displayName: "April Account",
            email: "april@example.com",
            expiresOn: "2026-04-30",
          }),
        ]}
      />,
    );

    const day = screen.getByTestId("expiry-calendar-day-2026-04-30");
    expect(within(day).getByLabelText("만료")).toBeInTheDocument();
    expect(within(day).getByText(/April Account/)).toBeInTheDocument();
  });

  it("renders weekly usage resets on the matching day", () => {
    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-weekly",
            displayName: "Weekly Account",
            email: "weekly@example.com",
            expiresOn: null,
            resetAtSecondary: "2026-04-28T12:00:00Z",
          }),
        ]}
      />,
    );

    const day = screen.getByTestId("expiry-calendar-day-2026-04-28");
    expect(within(day).getByLabelText("주간 초기화")).toBeInTheDocument();
    expect(within(day).getByText(/Weekly Account/)).toBeInTheDocument();
  });

  it("uses KST as the default time basis for weekly reset dates", () => {
    render(
      <AccountExpiryCalendar
        today="2026-05-01"
        initialMonth="2026-05"
        accounts={[
          createAccountSummary({
            accountId: "acc-kst",
            displayName: "KST Account",
            email: "kst@example.com",
            expiresOn: null,
            resetAtSecondary: "2026-04-30T15:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.queryByLabelText("달력 시간 기준")).not.toBeInTheDocument();
    const day = screen.getByTestId("expiry-calendar-day-2026-05-01");
    expect(within(day).getByText(/KST Account/)).toBeInTheDocument();
  });

  it("uses the configured UTC basis for weekly reset dates", () => {
    act(() => {
      useCalendarTimeZoneStore.setState({ timeZone: "UTC" });
    });

    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        initialMonth="2026-04"
        accounts={[
          createAccountSummary({
            accountId: "acc-utc",
            displayName: "UTC Account",
            email: "utc@example.com",
            expiresOn: null,
            resetAtSecondary: "2026-04-30T15:00:00Z",
          }),
        ]}
      />,
    );

    const day = screen.getByTestId("expiry-calendar-day-2026-04-30");
    expect(within(day).getByText(/UTC Account/)).toBeInTheDocument();
  });

  it("moves between months without changing the account data", async () => {
    const user = userEvent.setup();
    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-may",
            displayName: "May Account",
            email: "may@example.com",
            expiresOn: "2026-05-01",
          }),
        ]}
      />,
    );

    expect(screen.getByText("2026년 4월")).toBeInTheDocument();
    expect(screen.queryByText(/May Account/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다음 달" }));

    expect(screen.getByText("2026년 5월")).toBeInTheDocument();
    expect(screen.getByText(/May Account/)).toBeInTheDocument();
  });

  it("summarizes hidden same-type schedules with a meaningful more button", async () => {
    const user = userEvent.setup();
    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-alpha",
            displayName: "Alpha Account",
            email: "alpha@example.com",
            expiresOn: "2026-04-30",
          }),
          createAccountSummary({
            accountId: "acc-beta",
            displayName: "Beta Account",
            email: "beta@example.com",
            expiresOn: "2026-04-30",
          }),
          createAccountSummary({
            accountId: "acc-gamma",
            displayName: "Gamma Account",
            email: "gamma@example.com",
            expiresOn: "2026-04-30",
          }),
        ]}
      />,
    );

    const day = screen.getByTestId("expiry-calendar-day-2026-04-30");
    expect(within(day).getByText(/Alpha Account/)).toBeInTheDocument();
    expect(within(day).getByText(/Beta Account/)).toBeInTheDocument();
    await user.click(within(day).getByRole("button", { name: "2026-04-30 숨겨진 계정 일정 1개 보기" }));

    expect(within(day).getByText("만료 1개 더보기")).toBeInTheDocument();
    expect(screen.getByText("계정 일정 3개")).toBeInTheDocument();
    expect(screen.getByText(/Gamma Account/)).toBeInTheDocument();
    expect(within(day).queryByText(/Gamma Account/)).not.toBeInTheDocument();
  });

  it("summarizes hidden mixed schedules by type", () => {
    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-alpha-expiry",
            displayName: "Alpha Expiry",
            email: "alpha-expiry@example.com",
            expiresOn: "2026-04-30",
            resetAtSecondary: null,
          }),
          createAccountSummary({
            accountId: "acc-beta-expiry",
            displayName: "Beta Expiry",
            email: "beta-expiry@example.com",
            expiresOn: "2026-04-30",
            resetAtSecondary: null,
          }),
          createAccountSummary({
            accountId: "acc-gamma-expiry",
            displayName: "Gamma Expiry",
            email: "gamma-expiry@example.com",
            expiresOn: "2026-04-30",
            resetAtSecondary: null,
          }),
          createAccountSummary({
            accountId: "acc-hidden-weekly",
            displayName: "Hidden Weekly",
            email: "hidden-weekly@example.com",
            expiresOn: null,
            resetAtSecondary: "2026-04-30T12:00:00Z",
          }),
        ]}
      />,
    );

    const day = screen.getByTestId("expiry-calendar-day-2026-04-30");
    expect(within(day).getByText("만료 1 · 주간 1 더보기")).toBeInTheDocument();
  });

  it("uses the blur privacy mode for account labels", () => {
    act(() => {
      usePrivacyStore.setState({ mode: "blur" });
    });

    const { container } = render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-private",
            displayName: "private-account@example.com",
            email: "private-account@example.com",
            expiresOn: "2026-04-30",
          }),
        ]}
      />,
    );

    expect(screen.getByText("private-account@example.com")).toBeInTheDocument();
    expect(container.querySelector(".privacy-blur")).not.toBeNull();
  });

  it("uses the prefix privacy mode for account labels", () => {
    act(() => {
      usePrivacyStore.setState({ mode: "prefix" });
    });

    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-prefix",
            displayName: "abcdefghi@example.com",
            email: "abcdefghi@example.com",
            expiresOn: "2026-04-30",
          }),
        ]}
      />,
    );

    expect(screen.getByText(/abcdef…/)).toBeInTheDocument();
    expect(screen.queryByText("abcdefghi@example.com")).not.toBeInTheDocument();
  });

  it("visually distinguishes today and already-past expiration dates", () => {
    render(
      <AccountExpiryCalendar
        today="2026-04-26"
        accounts={[
          createAccountSummary({
            accountId: "acc-past",
            displayName: "Past Account",
            email: "past@example.com",
            expiresOn: "2026-04-20",
          }),
        ]}
      />,
    );

    expect(screen.getByTestId("expiry-calendar-day-2026-04-26")).toHaveClass("ring-primary/30");
    expect(screen.getByTestId("expiry-calendar-day-2026-04-20")).toHaveClass("bg-amber-500/5");
  });
});
