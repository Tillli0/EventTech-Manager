import { useEffect, useRef, useState } from "react";
import { CalendarRange, Check } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { JobsMiniCalendar } from "@/components/jobs/JobsMiniCalendar";
import { cn } from "@/lib/cn";
import type { Job } from "@/types/database";

function summarize(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return null;
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? format(start, "EEE, d. MMM yyyy", { locale: de })
    : `${format(start, "d. MMM", { locale: de })} – ${format(end, "d. MMM yyyy", { locale: de })}`;
}

/**
 * Zeitraum-Feld für Jobs: der Mini-Kalender (mit Punkten für bereits belegte
 * Tage) wird nur eingeblendet, während der Zeitraum gerade ausgewählt wird —
 * und dient dabei direkt als Datumsauswahl (keine zweite, separate Kalender-UI).
 */
export function JobDateRangePicker({
  jobs,
  start,
  end,
  onChange,
  excludeJobId,
}: {
  jobs: Job[] | undefined;
  start: Date | null;
  end: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  excludeJobId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [multiDay, setMultiDay] = useState(() => !!(start && end && start.toDateString() !== end.toDateString()));
  const awaitingEnd = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleOpen() {
    awaitingEnd.current = false;
    setOpen(true);
  }

  function handleSelectDay(day: Date) {
    if (!multiDay) {
      onChange(day, day);
      return;
    }
    if (!awaitingEnd.current) {
      onChange(day, day);
      awaitingEnd.current = true;
    } else {
      if (start && day < start) onChange(day, start);
      else onChange(start, day);
      awaitingEnd.current = false;
    }
  }

  const summary = summarize(start, end);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border bg-bg-raised px-3 text-left text-sm transition-colors",
          open ? "border-accent" : "border-border hover:border-accent/40",
          summary ? "text-ink" : "text-ink-faint",
        )}
      >
        <CalendarRange size={15} className="shrink-0 text-ink-faint" />
        <span className="truncate">{summary ?? "Zeitraum festlegen"}</span>
      </button>

      {open && (
        <div className="mt-2 w-full rounded-lg border border-border bg-bg-surface p-4 shadow-lg">
          <div className="mb-3 inline-flex rounded-md bg-bg-raised p-0.5">
            {[
              { v: false, label: "Eintägig" },
              { v: true, label: "Mehrtägig" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setMultiDay(opt.v);
                  awaitingEnd.current = false;
                }}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  multiDay === opt.v ? "bg-bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <JobsMiniCalendar
            jobs={jobs}
            selectedStart={start}
            selectedEnd={end}
            excludeJobId={excludeJobId}
            onSelectDay={handleSelectDay}
          />

          <div className="mt-3 flex justify-end border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!start || !end}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                start && end
                  ? "bg-accent text-accent-on hover:bg-accent/90"
                  : "cursor-not-allowed bg-bg-raised text-ink-faint",
              )}
            >
              <Check size={14} />
              Übernehmen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
