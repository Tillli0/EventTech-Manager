import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar } from "@/components/ui/Calendar";
import { cn } from "@/lib/cn";

/**
 * Datumsfeld mit aufklappendem Kalender (inline, kein Overlay). Optional von außen
 * steuerbar (open/onOpenChange), damit der Range-Picker automatisch weiterspringen kann.
 */
export function DateField({
  value,
  onChange,
  onComplete,
  min,
  placeholder = "Datum wählen",
  open: openProp,
  onOpenChange,
  className,
}: {
  value: Date | null;
  onChange: (day: Date) => void;
  /** Wird nach der Auswahl gerufen (z.B. um zum nächsten Feld zu springen). */
  onComplete?: () => void;
  min?: Date | null;
  placeholder?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setOpenState(v));

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border bg-bg-raised px-3 text-left text-sm transition-colors",
          open ? "border-accent" : "border-border hover:border-accent/40",
          value ? "text-ink" : "text-ink-faint",
        )}
      >
        <CalendarDays size={15} className="shrink-0 text-ink-faint" />
        <span className="truncate">
          {value ? format(value, "EEE, d. MMM yyyy", { locale: de }) : placeholder}
        </span>
      </button>

      {open && (
        <div className="mt-1">
          <Calendar
            value={value}
            min={min}
            onSelect={(day) => {
              onChange(day);
              setOpen(false);
              onComplete?.();
            }}
          />
        </div>
      )}
    </div>
  );
}
