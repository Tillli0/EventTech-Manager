import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Uhrzeit-Feld (HH:mm). Bewusst auf dem nativen time-Input aufgebaut (zuverlässig,
 * Tastatur + Picker), aber im Design-System gestylt. forwardRef, damit der Range-
 * Picker nach der Tagesauswahl automatisch hierher fokussieren kann.
 */
export const TimeField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    "aria-label"?: string;
  }
>(({ value, onChange, className, ...rest }, ref) => (
  <input
    ref={ref}
    type="time"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      "h-10 rounded-md border border-border bg-bg-raised px-3 text-sm text-ink",
      "focus:border-accent focus:outline-none",
      className,
    )}
    {...rest}
  />
));
TimeField.displayName = "TimeField";
