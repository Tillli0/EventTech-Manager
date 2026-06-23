import { useEffect, useRef, useState } from "react";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { Label } from "@/components/ui/Input";
import { combineDateAndTime } from "@/lib/datetime";
import { cn } from "@/lib/cn";

/**
 * Intelligente Zeitraum-Auswahl für Events:
 *  - Eintägig: ein Tag + Von/Bis-Uhrzeit. Nach Tagesauswahl springt der Fokus zur Uhrzeit.
 *  - Mehrtägig: Starttag → (automatisch) Endtag → Uhrzeiten.
 * Meldet bei jeder Änderung den fertigen Zeitraum (start/end als Date oder null).
 */
export function EventSchedulePicker({
  onChange,
  initialStart,
  initialEnd,
  defaultStartTime = "10:00",
  defaultEndTime = "18:00",
  autoOpen = false,
}: {
  onChange: (start: Date | null, end: Date | null) => void;
  initialStart?: Date | null;
  initialEnd?: Date | null;
  defaultStartTime?: string;
  defaultEndTime?: string;
  /** Beim Einblenden direkt den (Start-)Kalender öffnen. */
  autoOpen?: boolean;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const asTime = (d?: Date | null, fallback?: string) =>
    d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : (fallback ?? "10:00");
  const sameDay = (a?: Date | null, b?: Date | null) =>
    !!a && !!b && a.toDateString() === b.toDateString();

  const [multiDay, setMultiDay] = useState(() => {
    // Standard: Start → Ende (damit sich nach dem Startdatum das Enddatum öffnet).
    if (initialStart && initialEnd) return !sameDay(initialStart, initialEnd);
    return true;
  });
  const [day, setDay] = useState<Date | null>(initialStart ?? null);
  const [startDay, setStartDay] = useState<Date | null>(initialStart ?? null);
  const [endDay, setEndDay] = useState<Date | null>(initialEnd ?? initialStart ?? null);
  const [startTime, setStartTime] = useState(asTime(initialStart, defaultStartTime));
  const [endTime, setEndTime] = useState(asTime(initialEnd, defaultEndTime));

  const [dayOpen, setDayOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const startTimeRef = useRef<HTMLInputElement>(null);

  // Beim Einblenden direkt den ersten Kalender öffnen.
  useEffect(() => {
    if (!autoOpen) return;
    if (multiDay) setStartOpen(true);
    else setDayOpen(true);
    // nur einmal beim Mounten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fertigen Zeitraum nach außen melden.
  useEffect(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    if (multiDay) {
      if (startDay) start = combineDateAndTime(startDay, startTime);
      if (endDay) end = combineDateAndTime(endDay, endTime);
    } else if (day) {
      start = combineDateAndTime(day, startTime);
      end = combineDateAndTime(day, endTime);
    }
    onChange(start, end);
    // onChange bewusst nicht in deps — sonst Endlosschleife bei Inline-Funktionen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiDay, day, startDay, endDay, startTime, endTime]);

  const focusStartTime = () => setTimeout(() => startTimeRef.current?.focus(), 0);

  return (
    <div className="space-y-3">
      {/* Eintägig / Mehrtägig */}
      <div className="inline-flex rounded-md bg-bg-raised p-0.5">
        {[
          { v: false, label: "Eintägig" },
          { v: true, label: "Mehrtägig" },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setMultiDay(opt.v)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              multiDay === opt.v ? "bg-bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {multiDay ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Starttag *</Label>
            <DateField
              value={startDay}
              open={startOpen}
              onOpenChange={setStartOpen}
              onChange={(d) => {
                setStartDay(d);
                if (!endDay || endDay < d) setEndDay(d);
              }}
              onComplete={() => setEndOpen(true)} // automatisch zum Endtag
            />
          </div>
          <div>
            <Label>Endtag *</Label>
            <DateField
              value={endDay}
              min={startDay}
              open={endOpen}
              onOpenChange={setEndOpen}
              onChange={setEndDay}
              onComplete={focusStartTime} // dann zur Uhrzeit
            />
          </div>
        </div>
      ) : (
        <div>
          <Label>Tag *</Label>
          <DateField
            value={day}
            open={dayOpen}
            onOpenChange={setDayOpen}
            onChange={setDay}
            onComplete={focusStartTime}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Beginn *</Label>
          <TimeField ref={startTimeRef} aria-label="Startzeit" value={startTime} onChange={setStartTime} className="w-full" />
        </div>
        <div>
          <Label>Ende *</Label>
          <TimeField aria-label="Endzeit" value={endTime} onChange={setEndTime} className="w-full" />
        </div>
      </div>
    </div>
  );
}
