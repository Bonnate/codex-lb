import { create } from "zustand";

const CALENDAR_TIME_ZONE_STORAGE_KEY = "codex-lb-dashboard-calendar-time-zone";

export type CalendarTimeZone = "Asia/Seoul" | "local" | "UTC";

export const CALENDAR_TIME_ZONE_OPTIONS: Array<{ value: CalendarTimeZone; label: string; preview: string }> = [
  { value: "Asia/Seoul", label: "KST", preview: "한국 표준시" },
  { value: "local", label: "로컬", preview: "브라우저 기준" },
  { value: "UTC", label: "UTC", preview: "협정 세계시" },
];

const DEFAULT_CALENDAR_TIME_ZONE: CalendarTimeZone = "Asia/Seoul";

type CalendarTimeZoneState = {
  timeZone: CalendarTimeZone;
  setTimeZone: (timeZone: CalendarTimeZone) => void;
};

function isCalendarTimeZone(value: string | null): value is CalendarTimeZone {
  return CALENDAR_TIME_ZONE_OPTIONS.some((option) => option.value === value);
}

function readStoredTimeZone(): CalendarTimeZone {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") {
    return DEFAULT_CALENDAR_TIME_ZONE;
  }

  try {
    const stored = window.localStorage.getItem(CALENDAR_TIME_ZONE_STORAGE_KEY);
    return isCalendarTimeZone(stored) ? stored : DEFAULT_CALENDAR_TIME_ZONE;
  } catch {
    return DEFAULT_CALENDAR_TIME_ZONE;
  }
}

function persistTimeZone(timeZone: CalendarTimeZone): void {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") {
    return;
  }

  try {
    window.localStorage.setItem(CALENDAR_TIME_ZONE_STORAGE_KEY, timeZone);
  } catch {
    /* Storage blocked - silently ignore. */
  }
}

export const useCalendarTimeZoneStore = create<CalendarTimeZoneState>((set) => ({
  timeZone: readStoredTimeZone(),
  setTimeZone: (timeZone) => {
    persistTimeZone(timeZone);
    set({ timeZone });
  },
}));
