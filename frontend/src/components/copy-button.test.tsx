import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "@/components/copy-button";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe("CopyButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes to clipboard and shows success feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyButton value="secret-value" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "복사" }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("secret-value");
    expect(toastSuccess).toHaveBeenCalledWith("클립보드에 복사했습니다");
    expect(screen.getByRole("button", { name: "복사 완료" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_200);
    });
    expect(screen.getByRole("button", { name: "복사" })).toBeInTheDocument();
  });

  it("shows error toast when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard blocked"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyButton value="secret-value" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "복사" }));
      await Promise.resolve();
    });

    expect(toastError).toHaveBeenCalledWith("복사하지 못했습니다");
  });

  it("supports icon-only copy buttons with accessible labeling", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyButton value="secret-value" label="요청 ID 복사" iconOnly />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "요청 ID 복사" }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("secret-value");
    expect(screen.getByRole("button", { name: "요청 ID 복사 완료" })).toBeInTheDocument();
  });
});
