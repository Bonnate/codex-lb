import { useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarIcon, ChevronDown, Infinity as InfinityIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "1일", shortLabel: "1일", days: 1 },
  { label: "7일", shortLabel: "7일", days: 7 },
  { label: "30일", shortLabel: "30일", days: 30 },
  { label: "90일", shortLabel: "90일", days: 90 },
  { label: "1년", shortLabel: "1년", days: 365 },
] as const;

export type ExpiryPickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
};

export function ExpiryPicker({ value, onChange }: ExpiryPickerProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const activePresetDays = getActivePreset(value);

  function handleNever() {
    onChange(null);
    setShowCalendar(false);
    setOpen(false);
  }

  function handlePreset(days: number) {
    const date = addDays(new Date(), days);
    date.setHours(23, 59, 59, 0);
    onChange(date);
    setShowCalendar(false);
    setOpen(false);
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      date.setHours(23, 59, 59, 0);
      onChange(date);
      setShowCalendar(false);
      setOpen(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setShowCalendar(false);
  }

  function getTriggerLabel(): string {
    if (!value) return "만료 없음";
    const preset = PRESETS.find((p) => p.days === activePresetDays);
    if (preset) return `${preset.label} (${format(value, "yyyy-MM-dd")})`;
    return format(value, "yyyy-MM-dd");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2">
            {value ? <CalendarIcon className="size-4" /> : <InfinityIcon className="size-4" />}
            {getTriggerLabel()}
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto min-w-[280px] p-1" align="start">
        {showCalendar ? (
          <div className="-m-1">
            <div className="border-b px-3 py-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowCalendar(false)}
              >
                &larr; 프리셋으로 돌아가기
              </button>
            </div>
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={handleCalendarSelect}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              autoFocus
            />
          </div>
        ) : (
          <div>
            <OptionItem
              active={value === null}
              onClick={handleNever}
            >
              <InfinityIcon className="size-4" />
              만료 없음
            </OptionItem>

            <div className="bg-border -mx-1 my-1 h-px" />

            {PRESETS.map((preset) => (
              <OptionItem
                key={preset.days}
                active={activePresetDays === preset.days}
                onClick={() => handlePreset(preset.days)}
              >
                {preset.label}
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(addDays(new Date(), preset.days), "yyyy-MM-dd")}
                </span>
              </OptionItem>
            ))}

            <div className="bg-border -mx-1 my-1 h-px" />

            <OptionItem
              active={value !== null && activePresetDays === null}
              onClick={() => setShowCalendar(true)}
            >
              <CalendarIcon className="size-4" />
              날짜 직접 선택...
              {value && activePresetDays === null && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(value, "yyyy-MM-dd")}
                </span>
              )}
            </OptionItem>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function OptionItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground font-medium",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getActivePreset(value: Date | null): number | null {
  if (!value) return null;
  const now = new Date();
  const diffMs = value.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  for (const preset of PRESETS) {
    if (Math.abs(diffDays - preset.days) <= 0) {
      return preset.days;
    }
  }
  return null;
}
