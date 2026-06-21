import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/cn";
import type { CalendarEntry } from "@/types/database";
import { formatTime } from "@/lib/format";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function MonthGrid({
  currentMonth,
  entries,
  collidingIds,
  onDayClick,
  onEntryClick,
}: {
  currentMonth: Date;
  entries: CalendarEntry[];
  collidingIds: Set<string>;
  onDayClick: (day: Date) => void;
  onEntryClick: (entry: CalendarEntry) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  function entriesForDay(d: Date) {
    return entries.filter((e) => {
      const start = stripTime(new Date(e.start_at));
      const end = stripTime(new Date(e.end_at));
      return d >= start && d <= end;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-bg-surface">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-medium text-ink-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dayEntries = entriesForDay(d);
          const inMonth = isSameMonth(d, currentMonth);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              className={cn(
                "min-h-[88px] border-b border-r border-border p-1.5 text-left transition-colors hover:bg-bg-raised",
                !inMonth && "bg-bg-surface/50",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  isToday(d) ? "bg-accent font-semibold text-white" : inMonth ? "text-ink" : "text-ink-faint",
                )}
              >
                {format(d, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEntries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEntryClick(entry);
                    }}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[11px] font-medium",
                      collidingIds.has(entry.id)
                        ? "bg-status-defekt-bg text-status-defekt"
                        : "bg-accent-soft text-ink",
                    )}
                    title={`${entry.title} (${formatTime(entry.start_at)})`}
                  >
                    {entry.title}
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <p className="px-1 text-[10px] text-ink-faint">+{dayEntries.length - 3} weitere</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatMonthLabel(date: Date): string {
  return format(date, "MMMM yyyy", { locale: de });
}
