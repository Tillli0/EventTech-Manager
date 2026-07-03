import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabOption<T> {
  value: T;
  label: ReactNode;
  /** Optionales Icon links vom Label (Lucide). */
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  /** Optionaler Zähler rechts vom Label (Filter-Leisten). */
  count?: number;
}

/**
 * Segment-Umschalter (Tabs/Filter-Chips) — das gemeinsame Muster hinter den
 * Tab-Leisten von Kunden/Rechnungen/Website-Anfragen usw.: dunkle Schiene
 * (bg-raised) mit hervorgehobenem aktiven Segment (bg-surface + shadow).
 *
 * `size="sm"` für kompakte Inline-Umschalter (z.B. Stammkunde/Bereichsrechte),
 * `stretch` verteilt die Segmente auf die volle Breite.
 */
export function Tabs<T>({
  options,
  value,
  onChange,
  size = "md",
  stretch = false,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
  stretch?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-md bg-bg-raised",
        size === "md" ? "flex-wrap p-1" : "p-0.5",
        !stretch && "w-fit",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded font-medium transition-colors",
              size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs",
              stretch && "flex-1",
              active ? "bg-bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {Icon && <Icon size={14} />}
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active ? "bg-accent/15 text-accent" : "bg-bg-surface text-ink-faint",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
