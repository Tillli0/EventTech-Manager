import { useEffect, useRef, useState } from "react";
import { CalendarRange, Check } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { EventSchedulePicker } from "@/components/ui/EventSchedulePicker";
import { cn } from "@/lib/cn";

function summarize(start: Date | null, end: Date | null, allDay: boolean): string | null {
  if (!start || !end) return null;
  const sameDay = start.toDateString() === end.toDateString();
  if (allDay) {
    return sameDay
      ? format(start, "EEE, d. MMM yyyy", { locale: de })
      : `${format(start, "d. MMM", { locale: de })} – ${format(end, "d. MMM yyyy", { locale: de })}`;
  }
  if (sameDay) {
    return `${format(start, "EEE, d. MMM yyyy", { locale: de })} · ${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
  }
  return `${format(start, "d. MMM, HH:mm", { locale: de })} – ${format(end, "d. MMM yyyy, HH:mm", { locale: de })}`;
}

/**
 * Termin-Feld: zeigt eine schöne Zusammenfassung und öffnet bei Klick ein eigenes
 * Panel zur Auswahl. Nach Wahl des Startdatums öffnet sich automatisch das Enddatum.
 */
export function DateRangeField({
  onChange,
  initialStart,
  initialEnd,
  allDay = false,
  defaultSingleDay = false,
  placeholder = "Zeitraum festlegen",
}: {
  onChange: (start: Date | null, end: Date | null) => void;
  initialStart?: Date | null;
  initialEnd?: Date | null;
  allDay?: boolean;
  /** Ohne vorhandenen Zeitraum mit „Eintägig" starten (z.B. für Jobs). */
  defaultSingleDay?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | null>(initialStart ?? null);
  const [end, setEnd] = useState<Date | null>(initialEnd ?? null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const summary = summarize(start, end, allDay);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border bg-bg-raised px-3 text-left text-sm transition-colors",
          open ? "border-accent" : "border-border hover:border-accent/40",
          summary ? "text-ink" : "text-ink-faint",
        )}
      >
        <CalendarRange size={15} className="shrink-0 text-ink-faint" />
        <span className="truncate">{summary ?? placeholder}</span>
      </button>

      {open && (
        <div className="mt-2 w-full rounded-lg border border-border bg-bg-surface p-4 shadow-lg">
          <EventSchedulePicker
            autoOpen
            allDay={allDay}
            defaultSingleDay={defaultSingleDay}
            initialStart={start}
            initialEnd={end}
            onChange={(s, e) => {
              setStart(s);
              setEnd(e);
              onChange(s, e);
            }}
          />
          <div className="mt-3 flex justify-end border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!start || !end}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                start && end
                  ? "bg-accent text-white hover:bg-accent/90"
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
