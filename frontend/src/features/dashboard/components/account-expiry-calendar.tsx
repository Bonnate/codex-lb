import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, TimerOff } from "lucide-react";

import { renderPrivacyLabel } from "@/components/blur-email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AccountSummary } from "@/features/dashboard/schemas";
import { useCalendarTimeZoneStore, type CalendarTimeZone } from "@/hooks/use-calendar-time-zone";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_VISIBLE_EVENTS_PER_DAY = 2;

export type AccountExpiryCalendarEvent = {
  accountId: string;
  kind: "expiry" | "weekly_reset";
  label: string;
  email: string;
  dateKey: string;
  title: string;
};

type CalendarDay = {
  dateKey: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
};

export type AccountExpiryCalendarProps = {
  accounts: AccountSummary[];
  today?: string;
  initialMonth?: string;
};

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function utcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyInTimeZone(date: Date, timeZone: CalendarTimeZone): string {
  if (timeZone === "local") {
    return toDateKey(date);
  }
  if (timeZone === "UTC") {
    return utcDateKey(date);
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));
  return `${partByType.get("year")}-${partByType.get("month")}-${partByType.get("day")}`;
}

function isoToDateKey(value: string, timeZone: CalendarTimeZone): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return dateKeyInTimeZone(date, timeZone);
}

function currentMonthKey(today?: string): string {
  return (today ?? toDateKey(new Date())).slice(0, 7);
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

function formatMonthTitle(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${year}년 ${month}월`;
}

function addMonths(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const next = new Date(year, month - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function buildDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildCalendarDays(monthKey: string): CalendarDay[] {
  const { year, month } = parseMonthKey(monthKey);
  const firstDay = new Date(year, month - 1, 1);
  const leadingDays = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const previousMonth = addMonths(monthKey, -1);
  const nextMonth = addMonths(monthKey, 1);
  const previousMonthDays = new Date(year, month - 1, 0).getDate();
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - leadingDays + 1;
    if (dayOffset < 1) {
      const dayOfMonth = previousMonthDays + dayOffset;
      const { year: prevYear, month: prevMonth } = parseMonthKey(previousMonth);
      days.push({
        dateKey: buildDateKey(prevYear, prevMonth, dayOfMonth),
        dayOfMonth,
        inCurrentMonth: false,
      });
      continue;
    }

    if (dayOffset > daysInMonth) {
      const dayOfMonth = dayOffset - daysInMonth;
      const { year: nextYear, month: nextMonthNumber } = parseMonthKey(nextMonth);
      days.push({
        dateKey: buildDateKey(nextYear, nextMonthNumber, dayOfMonth),
        dayOfMonth,
        inCurrentMonth: false,
      });
      continue;
    }

    days.push({
      dateKey: buildDateKey(year, month, dayOffset),
      dayOfMonth: dayOffset,
      inCurrentMonth: true,
    });
  }

  return days;
}

function buildScheduleEvents(accounts: AccountSummary[], timeZone: CalendarTimeZone): AccountExpiryCalendarEvent[] {
  const events: AccountExpiryCalendarEvent[] = [];

  for (const account of accounts) {
    const label = account.displayName || account.email || account.accountId;
    if (account.expiresOn) {
      events.push({
        accountId: account.accountId,
        kind: "expiry",
        label,
        email: account.email,
        dateKey: account.expiresOn,
        title: "만료",
      });
    }

    if (account.resetAtSecondary) {
      const dateKey = isoToDateKey(account.resetAtSecondary, timeZone);
      if (dateKey) {
        events.push({
          accountId: account.accountId,
          kind: "weekly_reset",
          label,
          email: account.email,
          dateKey,
          title: "주간 초기화",
        });
      }
    }
  }

  return events.sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.label.localeCompare(right.label);
  });
}

function groupEventsByDate(events: AccountExpiryCalendarEvent[]): Map<string, AccountExpiryCalendarEvent[]> {
  const groups = new Map<string, AccountExpiryCalendarEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.dateKey) ?? [];
    existing.push(event);
    groups.set(event.dateKey, existing);
  }
  return groups;
}

function formatHiddenSummary(events: AccountExpiryCalendarEvent[]): string {
  const expiryCount = events.filter((event) => event.kind === "expiry").length;
  const weeklyResetCount = events.filter((event) => event.kind === "weekly_reset").length;

  if (expiryCount > 0 && weeklyResetCount > 0) {
    return `만료 ${expiryCount} · 주간 ${weeklyResetCount} 더보기`;
  }
  if (expiryCount > 0) {
    return `만료 ${expiryCount}개 더보기`;
  }
  return `주간 초기화 ${weeklyResetCount}개 더보기`;
}

function ScheduleIcon({
  kind,
  className,
}: {
  kind: AccountExpiryCalendarEvent["kind"];
  className?: string;
}) {
  if (kind === "expiry") {
    return <TimerOff className={className} aria-label="만료" />;
  }
  return <RefreshCw className={className} aria-label="주간 초기화" />;
}

export function AccountExpiryCalendar({
  accounts,
  today,
  initialMonth,
}: AccountExpiryCalendarProps) {
  const todayKey = today ?? toDateKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState(initialMonth ?? currentMonthKey(todayKey));
  const timeZone = useCalendarTimeZoneStore((s) => s.timeZone);
  const privacyMode = usePrivacyStore((s) => s.mode);

  const events = useMemo(() => buildScheduleEvents(accounts, timeZone), [accounts, timeZone]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  return (
    <Card className="animate-fade-in-up gap-4">
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              계정 일정 달력
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="이전 달"
              onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="min-w-24 text-center text-sm font-semibold tabular-nums">
              {formatMonthTitle(visibleMonth)}
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="다음 달"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {events.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
            표시할 계정 일정이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {WEEKDAY_LABELS.map((weekday) => (
                <div
                  key={weekday}
                  className="px-1.5 py-2 text-center text-[11px] font-medium text-muted-foreground sm:text-xs"
                >
                  {weekday}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const dayEvents = day.inCurrentMonth ? (eventsByDate.get(day.dateKey) ?? []) : [];
                const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS_PER_DAY);
                const hiddenEvents = dayEvents.slice(MAX_VISIBLE_EVENTS_PER_DAY);
                const hiddenCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS_PER_DAY);
                const isToday = day.dateKey === todayKey;
                const isPastSchedule = day.dateKey < todayKey && dayEvents.length > 0;

                return (
                  <div
                    key={day.dateKey}
                    data-testid={`expiry-calendar-day-${day.dateKey}`}
                    aria-label={`${day.dateKey} 계정 일정 ${dayEvents.length}개`}
                    className={cn(
                      "min-h-20 border-b border-r p-1.5 text-left last:border-r-0 sm:min-h-24 sm:p-2",
                      !day.inCurrentMonth && "bg-muted/20 text-muted-foreground/50",
                      isToday && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                      isPastSchedule && "bg-amber-500/5",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {day.dayOfMonth}
                    </div>
                    <div className="space-y-1">
                      {visibleEvents.map((event) => (
                        <div
                          key={`${event.kind}:${event.accountId}:${event.dateKey}`}
                          className={cn(
                            "truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:text-[11px]",
                            isPastSchedule
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : event.kind === "expiry"
                                ? "bg-primary/10 text-primary"
                                : "bg-sky-500/10 text-sky-700 dark:text-sky-300",
                          )}
                          title={`${event.title} · ${event.label} · ${event.dateKey}`}
                        >
                          <ScheduleIcon
                            kind={event.kind}
                            className="mr-1 inline h-3 w-3 align-[-2px] opacity-75"
                          />
                          {renderPrivacyLabel(event.label, privacyMode)}
                        </div>
                      ))}
                      {hiddenCount > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full truncate rounded-md bg-muted px-1.5 py-0.5 text-left text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:text-[11px]"
                              aria-label={`${day.dateKey} 숨겨진 계정 일정 ${hiddenCount}개 보기`}
                            >
                              {formatHiddenSummary(hiddenEvents)}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-80 p-3">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold">{day.dateKey}</p>
                                <p className="text-xs text-muted-foreground">
                                  계정 일정 {dayEvents.length}개
                                </p>
                              </div>
                              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                                {dayEvents.map((event) => (
                                  <div
                                    key={`${event.kind}:${event.accountId}:${event.dateKey}:popover`}
                                    className="flex min-w-0 items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs"
                                    title={`${event.title} · ${event.label}`}
                                  >
                                    <ScheduleIcon
                                      kind={event.kind}
                                      className={cn(
                                        "h-3.5 w-3.5 shrink-0",
                                        event.kind === "expiry"
                                          ? "text-primary"
                                          : "text-sky-600 dark:text-sky-300",
                                      )}
                                    />
                                    <span className="shrink-0 text-muted-foreground">
                                      {event.kind === "expiry" ? "만료" : "주간"}
                                    </span>
                                    <span className="min-w-0 truncate font-medium">
                                      {renderPrivacyLabel(event.label, privacyMode)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
