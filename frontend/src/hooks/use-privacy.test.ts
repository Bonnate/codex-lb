import { afterEach, describe, expect, it, vi } from "vitest";

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

function mockLocalStorage(entries: [string, string][]) {
  const storage = new Map<string, string>(entries);
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
    },
  });
}

describe("usePrivacyStore", () => {
  afterEach(() => {
    vi.resetModules();
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, "localStorage", originalLocalStorageDescriptor);
    }
  });

  it("initializes blur mode from the legacy privacy flag", async () => {
    mockLocalStorage([["codex-lb-privacy", "1"]]);

    const { usePrivacyStore } = await import("@/hooks/use-privacy");

    expect(usePrivacyStore.getState().mode).toBe("blur");
  });

  it("prefers the new privacy mode storage key over the legacy flag", async () => {
    mockLocalStorage([
      ["codex-lb-privacy-mode", "prefix"],
      ["codex-lb-privacy", "1"],
    ]);

    const { usePrivacyStore } = await import("@/hooks/use-privacy");

    expect(usePrivacyStore.getState().mode).toBe("prefix");
  });
});
