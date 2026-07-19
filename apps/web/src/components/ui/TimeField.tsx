import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

const pad = (n: number) => String(n).padStart(2, "0");

/** Zeitraster in `step`-Minuten (00:00 … 23:45), plus der aktuelle Wert falls außerhalb. */
function buildSlots(step: number, ensure?: string): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  if (ensure && /^\d{2}:\d{2}$/.test(ensure) && !out.includes(ensure)) {
    out.push(ensure);
    out.sort();
  }
  return out;
}

/**
 * Uhrzeit-Auswahl im selben Look wie der Kalender: ein Feld mit Uhr-Icon, das ein
 * aufklappendes Panel mit Zeit-Slots (15-Min-Raster) öffnet. Inline (kein Overlay),
 * damit im scrollbaren Dialog nichts abgeschnitten wird. Optional von außen steuerbar
 * (open/onOpenChange), damit nach der Datumswahl automatisch hierher gesprungen wird.
 */
export function TimeField({
  value,
  onChange,
  open: openProp,
  onOpenChange,
  onComplete,
  step = 15,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
  step?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setOpenState(v));

  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const slots = useMemo(() => buildSlots(step, value || undefined), [step, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    // den gewählten Eintrag in die Sichtbarkeit scrollen
    const t = setTimeout(() => {
      listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "center" });
    }, 0);
    return () => {
      document.removeEventListener("mousedown", onDown);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border bg-bg-raised px-3 text-left text-sm transition-colors",
          open ? "border-accent" : "border-border hover:border-accent/40",
          value ? "text-ink" : "text-ink-faint",
        )}
      >
        <Clock size={15} className="shrink-0 text-ink-faint" />
        <span>{value || "Zeit"}</span>
      </button>

      {open && (
        <div
          ref={listRef}
          className="scrollbar-thin mt-1 max-h-52 w-full min-w-[7rem] overflow-y-auto rounded-lg border border-border bg-bg-surface p-1 shadow-lg"
        >
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              data-selected={s === value}
              onClick={() => {
                onChange(s);
                setOpen(false);
                onComplete?.();
              }}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors",
                s === value ? "bg-accent font-semibold text-accent-on" : "text-ink hover:bg-bg-raised",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
