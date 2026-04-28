import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format } from "date-fns";
import { describe, expect, it, vi } from "vitest";

import { ExpiryPicker } from "./expiry-picker";

describe("ExpiryPicker", () => {
  it("shows '만료 없음' when value is null", () => {
    render(<ExpiryPicker value={null} onChange={vi.fn()} />);

    expect(screen.getByText("만료 없음")).toBeInTheDocument();
  });

  it("shows formatted date for a custom value", () => {
    const customDate = addDays(new Date(), 15);
    customDate.setHours(23, 59, 59, 0);

    render(<ExpiryPicker value={customDate} onChange={vi.fn()} />);

    expect(screen.getByText(format(customDate, "yyyy-MM-dd"))).toBeInTheDocument();
  });

  it("calls onChange with null when '만료 없음' is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const date = addDays(new Date(), 15);
    render(<ExpiryPicker value={date} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByText("만료 없음"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("calls onChange with a date when preset is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ExpiryPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByText("30일"));

    expect(onChange).toHaveBeenCalledOnce();
    const called = onChange.mock.calls[0][0] as Date;
    expect(called).toBeInstanceOf(Date);
    expect(called.getHours()).toBe(23);
    expect(called.getMinutes()).toBe(59);
  });

  it("shows preset options list by default (not calendar)", async () => {
    const user = userEvent.setup();
    render(<ExpiryPicker value={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("1일")).toBeInTheDocument();
    expect(screen.getByText("7일")).toBeInTheDocument();
    expect(screen.getByText("30일")).toBeInTheDocument();
    expect(screen.getByText("90일")).toBeInTheDocument();
    expect(screen.getByText("1년")).toBeInTheDocument();
    expect(screen.getByText("날짜 직접 선택...")).toBeInTheDocument();
  });

  it("shows calendar when '날짜 직접 선택...' is clicked", async () => {
    const user = userEvent.setup();
    render(<ExpiryPicker value={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByText("날짜 직접 선택..."));

    expect(await screen.findByText(/프리셋으로 돌아가기/)).toBeInTheDocument();
  });

  it("goes back to presets from calendar view", async () => {
    const user = userEvent.setup();
    render(<ExpiryPicker value={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByText("날짜 직접 선택..."));
    await user.click(await screen.findByText(/프리셋으로 돌아가기/));

    expect(await screen.findByText("1일")).toBeInTheDocument();
  });

  it("shows multiple 만료 없음 elements when popover open and value is null", async () => {
    const user = userEvent.setup();
    render(<ExpiryPicker value={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    // "만료 없음" appears in both the trigger and the popover option
    const allMatches = await screen.findAllByText("만료 없음");
    expect(allMatches.length).toBeGreaterThanOrEqual(2);
  });
});
