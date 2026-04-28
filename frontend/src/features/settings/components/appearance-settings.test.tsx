import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceSettings } from "@/features/settings/components/appearance-settings";
import { useCalendarTimeZoneStore } from "@/hooks/use-calendar-time-zone";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { useThemeStore } from "@/hooks/use-theme";
import { useTimeFormatStore } from "@/hooks/use-time-format";
import { createDashboardSettings } from "@/test/mocks/factories";

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

describe("AppearanceSettings", () => {
  beforeEach(() => {
    const storage = new Map<string, string>([
      ["codex-lb-privacy-mode", "visible"],
      ["codex-lb-privacy", "0"],
      ["codex-lb-theme", "light"],
      ["codex-lb-time-format", "12h"],
      ["codex-lb-dashboard-calendar-time-zone", "Asia/Seoul"],
    ]);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          storage.delete(key);
        }),
        clear: vi.fn(() => {
          storage.clear();
        }),
      },
    });
    usePrivacyStore.setState({ mode: "visible" });
    useCalendarTimeZoneStore.setState({ timeZone: "Asia/Seoul" });
    useThemeStore.setState({ preference: "light", theme: "light", initialized: true });
    useTimeFormatStore.setState({ timeFormat: "12h" });
  });

  afterEach(() => {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, "localStorage", originalLocalStorageDescriptor);
    }
  });

  it("exposes selected state for the time-format toggle", async () => {
    const user = userEvent.setup();

    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AppearanceSettings settings={createDashboardSettings()} busy={false} onSave={onSave} />,
    );

    const button12h = screen.getByRole("button", { name: /12h/i });
    const button24h = screen.getByRole("button", { name: /24h/i });

    expect(button12h).toHaveAttribute("aria-pressed", "true");
    expect(button24h).toHaveAttribute("aria-pressed", "false");

    await user.click(button24h);

    expect(button12h).toHaveAttribute("aria-pressed", "false");
    expect(button24h).toHaveAttribute("aria-pressed", "true");
    expect(useTimeFormatStore.getState().timeFormat).toBe("24h");
  });

  it("persists selected state for the account display mode control", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AppearanceSettings settings={createDashboardSettings()} busy={false} onSave={onSave} />,
    );

    const visibleButton = screen.getByRole("button", { name: /기본/i });
    const blurButton = screen.getByRole("button", { name: /흐림/i });
    const prefixButton = screen.getByRole("button", { name: /앞 6글자/i });

    expect(visibleButton).toHaveAttribute("aria-pressed", "true");
    expect(blurButton).toHaveAttribute("aria-pressed", "false");
    expect(prefixButton).toHaveAttribute("aria-pressed", "false");

    await user.click(prefixButton);

    expect(visibleButton).toHaveAttribute("aria-pressed", "false");
    expect(prefixButton).toHaveAttribute("aria-pressed", "true");
    expect(usePrivacyStore.getState().mode).toBe("prefix");
    expect(window.localStorage.getItem("codex-lb-privacy-mode")).toBe("prefix");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("persists selected state for the dashboard calendar time basis control", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AppearanceSettings settings={createDashboardSettings()} busy={false} onSave={onSave} />,
    );

    const kstButton = screen.getByRole("button", { name: /KST/i });
    const utcButton = screen.getByRole("button", { name: /UTC/i });

    expect(kstButton).toHaveAttribute("aria-pressed", "true");
    expect(utcButton).toHaveAttribute("aria-pressed", "false");

    await user.click(utcButton);

    expect(kstButton).toHaveAttribute("aria-pressed", "false");
    expect(utcButton).toHaveAttribute("aria-pressed", "true");
    expect(useCalendarTimeZoneStore.getState().timeZone).toBe("UTC");
    expect(window.localStorage.getItem("codex-lb-dashboard-calendar-time-zone")).toBe("UTC");
    expect(onSave).not.toHaveBeenCalled();
  });
});
