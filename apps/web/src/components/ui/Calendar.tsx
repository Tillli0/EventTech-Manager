import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Schlichter Monatskalender im Design-System. Wird inline (aufklappend) genutzt,
 * damit nichts im scrollbaren Dialog abgeschnitten wird.
 */
export function Calendar({
  value,
  onSelect,
  min,
  rangeStart,
}: {
  value: Date | null;
  onSelect: (day: Date) => void;
  /** Tage vor diesem Datum sind nicht wählbar (z.B. Ende ≥ Start). */
  min?: Date | null;
  /** Anderer Endpunkt eines Zeitraums — wird markiert, die Spanne dazwischen hervorgehoben. */
  rangeStart?: Date | null;
}) {
  const [month, setMonth] = useState(() => startOfMonth(value ?? new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const minDay = min ? startOfDay(min) : null;

  return (
    <div className="w-[17rem] rounded-lg border border-border bg-bg-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-bg-raised hover:text-ink"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium capitalize text-ink">
          {format(month, "LLLL yyyy", { locale: de })}
        </span>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-bg-raised hover:text-ink"
          aria-label="Nächster Monat"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-[0.65rem] font-medium text-ink-faint">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const d0 = startOfDay(day);
          const selected = value && isSameDay(day, value);
          const isRangeStart = rangeStart && isSameDay(day, rangeStart);
          const lo = rangeStart && value ? (rangeStart < value ? startOfDay(rangeStart) : startOfDay(value)) : null;
          const hi = rangeStart && value ? (rangeStart < value ? startOfDay(value) : startOfDay(rangeStart)) : null;
          const inRange = lo && hi && d0 > lo && d0 < hi;
          const disabled = minDay && day < minDay;
          const outside = !isSameMonth(day, month);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!!disabled}
              onClick={() => onSelect(day)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-sm transition-colors",
                selected
                  ? "bg-accent font-semibold text-accent-on"
                  : isRangeStart
                    ? "bg-accent/15 font-semibold text-accent ring-1 ring-inset ring-accent"
                    : inRange
                      ? "bg-accent/10 text-ink"
                      : disabled
                        ? "cursor-not-allowed text-ink-faint/40"
                        : "text-ink hover:bg-bg-raised",
                !selected && !isRangeStart && !inRange && outside && "text-ink-faint",
                !selected && !isRangeStart && !inRange && !disabled && isToday(day) && "ring-1 ring-inset ring-accent/40",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
