import { useMemo, useState } from "react";
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
import { useCalendarEntries, useJobMilestonesInRange } from "@/hooks/useCalendar";

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

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

  // Termine + Job-Zeitplan des angezeigten Mini-Monats laden, um Tage mit
  // Aktivität zu markieren (kleiner Punkt unter der Tageszahl).
  const { data: entries } = useCalendarEntries(gridStart.toISOString(), gridEnd.toISOString());
  const { data: milestones } = useJobMilestonesInRange(gridStart.toISOString(), gridEnd.toISOString());

  const markedDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries ?? []) {
      // Mehrtägige Termine: jeden abgedeckten Tag markieren.
      const d = new Date(e.start_at);
      d.setHours(0, 0, 0, 0);
      const end = new Date(e.end_at);
      let cur = d;
      while (cur <= end) {
        set.add(dayKey(cur));
        cur = addDays(cur, 1);
      }
    }
    for (const m of milestones ?? []) set.add(dayKey(new Date(m.at)));
    return set;
  }, [entries, milestones]);

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
          const marked = markedDays.has(dayKey(day));
          return (
            <button
              key={day.toISOString()}
              onClick={() => onPick(day)}
              className={cn(
                "relative flex h-7 items-center justify-center rounded-full text-xs transition-colors",
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
              {marked && !selected && (
                <span
                  className={cn(
                    "absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    today ? "bg-accent" : inMonth ? "bg-ink-muted" : "bg-ink-faint",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
