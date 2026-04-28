import { describe, expect, it } from "vitest";

import { getDefaultAccountExpiryDate } from "@/features/accounts/expiry";

describe("getDefaultAccountExpiryDate", () => {
  it("returns one calendar month after the provided local date", () => {
    expect(getDefaultAccountExpiryDate(new Date(2026, 3, 26))).toBe("2026-05-26");
  });

  it("clamps to the target month's last day when the same date does not exist", () => {
    expect(getDefaultAccountExpiryDate(new Date(2026, 0, 31))).toBe("2026-02-28");
    expect(getDefaultAccountExpiryDate(new Date(2024, 0, 31))).toBe("2024-02-29");
  });
});
