import { useState } from "react";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { combineDateAndTime, timeToInput } from "@/lib/datetime";
import { cn } from "@/lib/cn";

/**
 * Datum + Uhrzeit in einem Feld. Nach der Tagesauswahl öffnet sich automatisch
 * das Uhrzeit-Panel (gewünschtes Verhalten für einzelne Zeitpunkte).
 */
export function DateTimeField({
  value,
  onChange,
  defaultTime = "10:00",
  min,
  className,
}: {
  value: Date | null;
  onChange: (value: Date) => void;
  defaultTime?: string;
  min?: Date | null;
  className?: string;
}) {
  const [timeOpen, setTimeOpen] = useState(false);
  const time = value ? timeToInput(value) : defaultTime;

  return (
    <div className={cn("flex gap-2", className)}>
      <DateField
        className="flex-1"
        value={value}
        min={min}
        onChange={(day) => onChange(combineDateAndTime(day, time))}
        onComplete={() => setTimeOpen(true)}
      />
      <TimeField
        aria-label="Uhrzeit"
        value={time}
        open={timeOpen}
        onOpenChange={setTimeOpen}
        onChange={(t) => onChange(combineDateAndTime(value ?? new Date(), t))}
        className="w-28"
      />
    </div>
  );
}
