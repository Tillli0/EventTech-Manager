import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth,
  isSameDay,
  startOfDay,
  format,
} from "date-fns";
import { de } from "date-fns/locale";
import type { Job } from "@/types/database";
import { cn } from "@/lib/cn";

interface DayJob {
  id: string;
  title: string;
  color: string;
}

/**
 * Kompakter Monats-Mini-Kalender, der bei der Job-Zeitraumauswahl die bereits
 * vorhandenen Jobs (als farbige Punkte) sowie den aktuell gewählten Zeitraum
 * (hervorgehoben) anzeigt. Ohne `onSelectDay` reine Anzeige; mit `onSelectDay`
 * werden die Tage klickbar (Zeitraum direkt im selben Kalender wählen, der
 * auch die Buchungs-Punkte zeigt).
 */
export function JobsMiniCalendar({
  jobs,
  selectedStart,
  selectedEnd,
  excludeJobId,
  onSelectDay,
}: {
  jobs: Job[] | undefined;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  /** Beim Bearbeiten den eigenen Job ausblenden. */
  excludeJobId?: string;
  /** Wenn gesetzt, werden Tage klickbar (Datumsauswahl statt reiner Anzeige). */
  onSelectDay?: (day: Date) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(selectedStart ?? new Date()));

  // Folgt der Auswahl: wechselt der gewählte Starttag den Monat, springt der Kalender mit.
  useEffect(() => {
    if (selectedStart) setMonth(startOfMonth(selectedStart));
  }, [selectedStart]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  // Pro Tag (yyyy-MM-dd) die überlappenden Jobs sammeln.
  const jobsByDay = useMemo(() => {
    const map = new Map<string, DayJob[]>();
    for (const job of jobs ?? []) {
      if (excludeJobId && job.id === excludeJobId) continue;
      const start = startOfDay(new Date(job.start_date));
      const end = startOfDay(new Date(job.end_date));
      for (const day of eachDayOfInterval({ start, end })) {
        const key = format(day, "yyyy-MM-dd");
        const list = map.get(key) ?? [];
        list.push({ id: job.id, title: job.title, color: job.color });
        map.set(key, list);
      }
    }
    return map;
  }, [jobs, excludeJobId]);

  const selStart = selectedStart ? startOfDay(selectedStart) : null;
  const selEnd = selectedEnd ? startOfDay(selectedEnd) : null;

  function inSelection(day: Date): boolean {
    if (!selStart) return false;
    const d = startOfDay(day);
    const end = selEnd ?? selStart;
    return d >= selStart && d <= end;
  }

  return (
    <div className="rounded-lg border border-border bg-bg-raised/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-bg-raised hover:text-ink"
          aria-label="Voriger Monat"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium text-ink">{format(month, "MMMM yyyy", { locale: de })}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-bg-raised hover:text-ink"
          aria-label="Nächster Monat"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <span key={d} className="py-1 text-[0.6rem] font-medium uppercase text-ink-faint">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayJobs = jobsByDay.get(key);
          const selected = inSelection(day);
          const today = isSameDay(day, new Date());
          const Tag = onSelectDay ? "button" : "div";
          return (
            <Tag
              key={key}
              type={onSelectDay ? "button" : undefined}
              onClick={onSelectDay ? () => onSelectDay(day) : undefined}
              title={dayJobs?.map((j) => j.title).join(", ")}
              className={cn(
                "flex h-9 flex-col items-center justify-start rounded py-1 text-xs transition-colors",
                !isSameMonth(day, month) && "text-ink-faint/50",
                selected ? "bg-accent text-accent-on" : "text-ink-muted",
                onSelectDay && !selected && "hover:bg-bg-raised hover:text-ink",
              )}
            >
              <span className={cn("tabular-nums", today && !selected && "font-bold text-accent")}>
                {format(day, "d")}
              </span>
              {dayJobs && dayJobs.length > 0 && (
                <span className="mt-0.5 flex gap-0.5">
                  {dayJobs.slice(0, 3).map((j, i) => (
                    <span
                      key={`${j.id}-${i}`}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: selected ? "#ffffff" : j.color }}
                    />
                  ))}
                </span>
              )}
            </Tag>
          );
        })}
      </div>
      <p className="mt-2 text-[0.65rem] text-ink-faint">Punkte = bereits geplante Jobs an diesem Tag.</p>
    </div>
  );
}
