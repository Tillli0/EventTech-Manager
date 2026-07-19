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

  // Pro Tag bis zu drei verschiedene Job-Farben sammeln, damit die Punkte unten
  // genau wie im großen Kalender in der Job-Farbe erscheinen.
  const markedDays = useMemo(() => {
    const map = new Map<string, string[]>();
    const push = (key: string, color: string) => {
      const arr = map.get(key) ?? [];
      if (!arr.includes(color) && arr.length < 3) arr.push(color);
      map.set(key, arr);
    };
    for (const e of entries ?? []) {
      const color = e.job?.color ?? "#6366f1";
      // Mehrtägige Termine: jeden abgedeckten Tag markieren.
      const d = new Date(e.start_at);
      d.setHours(0, 0, 0, 0);
      const end = new Date(e.end_at);
      let cur = d;
      while (cur <= end) {
        push(dayKey(cur), color);
        cur = addDays(cur, 1);
      }
    }
    for (const m of milestones ?? []) push(dayKey(new Date(m.at)), m.job?.color ?? "#6366f1");
    return map;
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
          const dotColors = markedDays.get(dayKey(day)) ?? [];
          return (
            <button
              key={day.toISOString()}
              onClick={() => onPick(day)}
              className={cn(
                "relative flex h-7 items-center justify-center rounded-full text-xs transition-colors",
                selected
                  ? "bg-accent font-semibold text-accent-on"
                  : today
                    ? "font-semibold text-accent hover:bg-bg-raised"
                    : inMonth
                      ? "text-ink hover:bg-bg-raised"
                      : "text-ink-faint hover:bg-bg-raised",
              )}
            >
              {format(day, "d")}
              {dotColors.length > 0 && !selected && (
                <span className="absolute bottom-[3px] left-1/2 flex -translate-x-1/2 gap-0.5">
                  {dotColors.map((c, i) => (
                    <span
                      key={i}
                      className={cn("h-1 w-1 rounded-full", !inMonth && "opacity-50")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
