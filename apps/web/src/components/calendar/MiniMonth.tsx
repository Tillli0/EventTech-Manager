import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["M", "D", "M", "D", "F", "S", "S"];

/**
 * Kompakter Monatsüberblick zum schnellen Springen — wie der kleine Kalender
 * links bei Google Calendar. Tag anklicken springt im Hauptkalender dorthin.
 */
export function MiniMonth({
  selectedDate,
  onPick,
}: {
  selectedDate: Date;
  onPick: (day: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold capitalize text-ink">
          {format(viewMonth, "MMMM yyyy", { locale: de })}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="rounded p-1 text-ink-muted hover:bg-bg-raised hover:text-ink"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="rounded p-1 text-ink-muted hover:bg-bg-raised hover:text-ink"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-ink-faint">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onPick(day)}
              className={cn(
                "flex h-7 items-center justify-center rounded-full text-xs transition-colors",
                selected
                  ? "bg-accent font-semibold text-white"
                  : today
                    ? "font-semibold text-accent hover:bg-bg-raised"
                    : inMonth
                      ? "text-ink hover:bg-bg-raised"
                      : "text-ink-faint hover:bg-bg-raised",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
