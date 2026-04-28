import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyCostDisplayFromSettings } from "@/features/settings/cost-display";
import { createDashboardSettings } from "@/test/mocks/factories";
import { RESET_ERROR_LABEL } from "@/utils/constants";
import { useTimeFormatStore } from "@/hooks/use-time-format";
import {
  formatChartDateTime,
  formatDateTimeInline,
  formatAccessTokenLabel,
  formatCachedTokensMeta,
  formatCompactNumber,
  formatCountdown,
  formatCostUsd,
  formatCurrency,
  formatIdTokenLabel,
  formatModelLabel,
  formatPlanTypeLabel,
  formatNumber,
  formatPercent,
  formatPercentNullable,
  formatPercentValue,
  formatQuotaResetLabel,
  formatQuotaResetMeta,
  formatRate,
  formatResetRelative,
  formatRefreshTokenLabel,
  formatRelative,
  formatTimeLong,
  formatTokensWithCached,
  formatWindowLabel,
  formatWindowMinutes,
  parseDate,
  toNumber,
  truncateText,
} from "@/utils/formatters";

describe("formatters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    useTimeFormatStore.setState({ timeFormat: "12h" });
  });

  afterEach(() => {
    vi.useRealTimers();
    applyCostDisplayFromSettings(createDashboardSettings());
  });

  it("parses numbers safely", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber("42.5")).toBe(42.5);
    expect(toNumber("")).toBeNull();
    expect(toNumber("abc")).toBeNull();
  });

  it("parses dates safely", () => {
    expect(parseDate("2026-01-01T00:00:00.000Z")).not.toBeNull();
    expect(parseDate("invalid-date")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });

  it("formats known plan types in Korean", () => {
    expect(formatPlanTypeLabel("free")).toBe("무료");
    expect(formatPlanTypeLabel("PLUS")).toBe("플러스");
    expect(formatPlanTypeLabel("custom_tier")).toBe("Custom tier");
  });

  it("formats number-like values", () => {
    expect(formatNumber(1200)).toBe("1,200");
    expect(formatCompactNumber(1200)).toMatch(/K$/);
    expect(formatCurrency(12)).toMatch(/^\$/);
    expect(formatNumber("abc")).toBe("--");
  });

  it("formats USD cost amounts using display currency snapshot", () => {
    applyCostDisplayFromSettings(
      createDashboardSettings({
        displayCostCurrency: "EUR",
        costFxRates: { EUR: 0.5 },
      }),
    );
    expect(formatCostUsd(10)).toMatch(/€/);
    expect(formatCostUsd(10)).toMatch(/5/);

    applyCostDisplayFromSettings(
      createDashboardSettings({
        displayCostCurrency: "JPY",
        costFxRates: { JPY: 150 },
      }),
    );
    const jpy = formatCostUsd(10);
    expect(jpy).toMatch(/¥/);
    expect(jpy).not.toMatch(/\.\d{2}/);

    applyCostDisplayFromSettings(
      createDashboardSettings({
        displayCostCurrency: "EUR",
        costFxRates: {},
      }),
    );
    expect(formatCostUsd(12)).toMatch(/^\$/);
  });

  it("formats percent and rate values", () => {
    expect(formatPercent(49.6)).toBe("50%");
    expect(formatPercent(null)).toBe("0%");
    expect(formatPercentNullable(49.6)).toBe("50%");
    expect(formatPercentNullable(null)).toBe("--");
    expect(formatPercentValue(49.6)).toBe(50);
    expect(formatPercentValue(null)).toBe(0);
    expect(formatRate(0.123)).toBe("12.3%");
    expect(formatRate(null)).toBe("--");
  });

  it("formats window labels", () => {
    expect(formatWindowMinutes(1440)).toBe("1일");
    expect(formatWindowMinutes(180)).toBe("3시간");
    expect(formatWindowMinutes(30)).toBe("30분");
    expect(formatWindowMinutes(0)).toBe("--");
    expect(formatWindowLabel("primary", null)).toBe("5시간");
    expect(formatWindowLabel("secondary", null)).toBe("7일");
  });

  it("formats token meta strings", () => {
    expect(formatTokensWithCached(1234, 200)).toContain("캐시");
    expect(formatTokensWithCached(1234, 0)).not.toContain("캐시");
    expect(formatCachedTokensMeta(1000, 250)).toBe("캐시: 250 (25%)");
    expect(formatCachedTokensMeta(0, 250)).toBe("캐시: --");
  });

  it("formats model and datetime labels", () => {
    expect(formatModelLabel("gpt-4.1", "high")).toBe("gpt-4.1 (high)");
    expect(formatModelLabel("gpt-4.1", "high", "priority")).toBe("gpt-4.1 (high, priority)");
    expect(formatModelLabel("gpt-4.1", null, "priority")).toBe("gpt-4.1 (priority)");
    expect(formatModelLabel("gpt-4.1", null)).toBe("gpt-4.1");
    expect(formatModelLabel(null, null)).toBe("--");

    const formatted = formatTimeLong("2026-01-01T00:00:00.000Z");
    expect(formatted.time).not.toBe("--");
    expect(formatted.date).not.toBe("--");
  });

  it("respects the configured 12h or 24h time format", () => {
    const iso = "2026-01-01T00:00:00.000Z";

    const twelveHour = formatTimeLong(iso).time;
    expect(twelveHour).toMatch(/AM|PM/);

    useTimeFormatStore.getState().setTimeFormat("24h");

    const twentyFourHour = formatTimeLong(iso).time;
    expect(twentyFourHour).not.toMatch(/AM|PM/);
    expect(formatDateTimeInline(iso)).toContain(twentyFourHour);
    expect(formatChartDateTime(iso)).not.toMatch(/AM|PM/);
  });

  it("formats relative and countdown values", () => {
    expect(formatRelative(30 * 60_000)).toBe("30분 남음");
    expect(formatRelative(90 * 60_000)).toBe("2시간 남음");
    expect(formatRelative(30 * 60 * 60_000)).toBe("2일 남음");
    expect(formatResetRelative(30 * 60_000)).toBe("30분");
    expect(formatResetRelative((4 * 60 + 13) * 60_000)).toBe("4시간 13분");
    expect(formatResetRelative((6 * 24 + 13) * 60 * 60_000)).toBe("6일 13시간");
    expect(formatCountdown(125)).toBe("2:05");
  });

  it("formats quota reset labels", () => {
    const in30m = new Date(Date.now() + 30 * 60_000).toISOString();
    const in4h13m = new Date(Date.now() + (4 * 60 + 13) * 60_000).toISOString();
    const in6d13h = new Date(Date.now() + (6 * 24 + 13) * 60 * 60_000).toISOString();
    const inPast = new Date(Date.now() - 1_000).toISOString();
    expect(formatQuotaResetLabel(in30m)).toBe("30분 후");
    expect(formatQuotaResetLabel(in4h13m)).toBe("4시간 13분 후");
    expect(formatQuotaResetLabel(in6d13h)).toBe("6일 13시간 후");
    expect(formatQuotaResetLabel(inPast)).toBe("곧");
    expect(formatQuotaResetLabel("1970-01-01T00:00:00.000Z")).toBe(RESET_ERROR_LABEL);
    expect(formatQuotaResetLabel("bad-date")).toBe(RESET_ERROR_LABEL);
    expect(formatQuotaResetMeta(null, null)).toBe("초기화 시각을 알 수 없음");
  });

  it("truncates long text safely", () => {
    expect(truncateText("short", 10)).toBe("short");
    expect(truncateText("1234567890", 5)).toBe("1234\u2026");
    expect(truncateText(null, 5)).toBe("");
  });

  it("formats auth token status labels", () => {
    const future = new Date(Date.now() + 2 * 60 * 60_000).toISOString();

    expect(formatAccessTokenLabel(null)).toBe("없음");
    expect(
      formatAccessTokenLabel({
        access: { expiresAt: "invalid-date" },
      }),
    ).toBe("알 수 없음");
    expect(
      formatAccessTokenLabel({
        access: { expiresAt: "1970-01-01T00:00:00.000Z" },
      }),
    ).toBe("만료됨");
    expect(
      formatAccessTokenLabel({
        access: { expiresAt: future },
      }),
    ).toBe("유효 (2시간 남음)");

    expect(
      formatRefreshTokenLabel({
        refresh: { state: "stored" },
      }),
    ).toBe("저장됨");
    expect(
      formatRefreshTokenLabel({
        refresh: { state: "expired" },
      }),
    ).toBe("만료됨");
    expect(formatRefreshTokenLabel(undefined)).toBe("알 수 없음");

    expect(
      formatIdTokenLabel({
        idToken: { state: "parsed" },
      }),
    ).toBe("파싱됨");
    expect(
      formatIdTokenLabel({
        idToken: { state: "unknown" },
      }),
    ).toBe("알 수 없음");
  });
});
