import { CalendarClock, Clock3, Coins, Monitor, Moon, Palette, Sun } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildSettingsUpdateRequest } from "@/features/settings/payload";
import { DISPLAY_COST_CURRENCY_OPTIONS } from "@/features/settings/display-cost-currencies";
import type { DashboardSettings, SettingsUpdateRequest } from "@/features/settings/schemas";
import { CALENDAR_TIME_ZONE_OPTIONS, useCalendarTimeZoneStore } from "@/hooks/use-calendar-time-zone";
import { usePrivacyStore, type PrivacyMode } from "@/hooks/use-privacy";
import { useThemeStore, type ThemePreference } from "@/hooks/use-theme";
import { useTimeFormatStore, type TimeFormatPreference } from "@/hooks/use-time-format";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
  { value: "auto", label: "시스템", icon: Monitor },
];

const TIME_FORMAT_OPTIONS: { value: TimeFormatPreference; label: string; preview: string }[] = [
  { value: "12h", label: "12h", preview: "03:45 PM" },
  { value: "24h", label: "24h", preview: "15:45" },
];

const PRIVACY_MODE_OPTIONS: { value: PrivacyMode; label: string; preview: string }[] = [
  { value: "visible", label: "기본", preview: "전체 표시" },
  { value: "blur", label: "흐림", preview: "모자이크" },
  { value: "prefix", label: "앞 6글자", preview: "abcdef…" },
];

export type AppearanceSettingsProps = {
  settings: DashboardSettings;
  busy: boolean;
  onSave: (payload: SettingsUpdateRequest) => Promise<void>;
};

export function AppearanceSettings({ settings, busy, onSave }: AppearanceSettingsProps) {
  const preference = useThemeStore((s) => s.preference);
  const setTheme = useThemeStore((s) => s.setTheme);
  const timeFormat = useTimeFormatStore((s) => s.timeFormat);
  const setTimeFormat = useTimeFormatStore((s) => s.setTimeFormat);
  const privacyMode = usePrivacyStore((s) => s.mode);
  const setPrivacyMode = usePrivacyStore((s) => s.setMode);
  const calendarTimeZone = useCalendarTimeZoneStore((s) => s.timeZone);
  const setCalendarTimeZone = useCalendarTimeZoneStore((s) => s.setTimeZone);

  const save = (patch: Partial<SettingsUpdateRequest>) =>
    void onSave(buildSettingsUpdateRequest(settings, patch));

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
             <div>
               <h3 className="text-sm font-semibold">화면 표시</h3>
               <p className="text-xs text-muted-foreground">인터페이스 모양과 시간 표시 방식을 선택합니다.</p>
             </div>
           </div>
         </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">테마</p>
            <p className="text-xs text-muted-foreground">선호하는 색상 구성을 선택하세요.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/40 p-0.5">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={preference === value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                  preference === value
                    ? "bg-background text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">계정 표시</p>
            <p className="text-xs text-muted-foreground">계정과 이메일 라벨의 개인정보 표시 방식을 선택합니다.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/40 p-0.5">
            {PRIVACY_MODE_OPTIONS.map(({ value, label, preview }) => (
              <button
                key={value}
                type="button"
                aria-pressed={privacyMode === value}
                onClick={() => setPrivacyMode(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors duration-200",
                  privacyMode === value
                    ? "bg-background text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block">{label}</span>
                <span className="block text-[10px] font-normal text-muted-foreground">{preview}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">시간 형식</p>
              <p className="text-xs text-muted-foreground">대시보드 전체 날짜와 시간 표시 형식에 적용합니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/40 p-0.5">
            {TIME_FORMAT_OPTIONS.map(({ value, label, preview }) => (
              <button
                key={value}
                type="button"
                aria-pressed={timeFormat === value}
                onClick={() => setTimeFormat(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors duration-200",
                  timeFormat === value
                    ? "bg-background text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block">{label}</span>
                <span className="block text-[10px] font-normal text-muted-foreground">{preview}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">달력 시간 기준</p>
              <p className="text-xs text-muted-foreground">대시보드 계정 일정 달력의 주간 초기화 날짜 계산에 적용합니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/40 p-0.5">
            {CALENDAR_TIME_ZONE_OPTIONS.map(({ value, label, preview }) => (
              <button
                key={value}
                type="button"
                aria-pressed={calendarTimeZone === value}
                onClick={() => setCalendarTimeZone(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors duration-200",
                  calendarTimeZone === value
                    ? "bg-background text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block">{label}</span>
                <span className="block text-[10px] font-normal text-muted-foreground">{preview}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Coins className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">비용 표시 통화</p>
              <p className="text-xs text-muted-foreground">
                내부 집계는 USD이며, 대시보드의 비용 숫자만 선택한 통화로 환산해 보여 줍니다.
              </p>
            </div>
          </div>
          <Select
            value={settings.displayCostCurrency}
            onValueChange={(value) => save({ displayCostCurrency: value })}
          >
            <SelectTrigger className="h-8 w-full min-w-[8rem] text-xs sm:w-32" disabled={busy}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {DISPLAY_COST_CURRENCY_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
