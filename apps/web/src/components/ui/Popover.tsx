import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PopoverProps {
  /** Das anklickbare Element (z.B. ein Icon-Button), das den Popover öffnet. */
  trigger: ReactNode;
  children: ReactNode;
  /** Ausrichtung des Panels relativ zum Trigger. */
  align?: "left" | "right";
  className?: string;
}

/**
 * Minimaler Anker-Popover: relativer Wrapper + absolut positioniertes Panel.
 * Schließt bei Klick außerhalb und bei Escape. Kein Portal nötig — reicht für
 * kleine Inline-Menüs (z.B. die Task-Einstellungen).
 */
export function Popover({ trigger, children, align = "right", className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center">
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-[15rem] rounded-lg border border-border bg-bg-surface p-3 shadow-xl",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
          role="dialog"
        >
          {children}
        </div>
      )}
    </div>
  );
}
