import { cn } from "@/lib/cn";

export interface PillOption {
  value: string;
  label: string;
  /** Optionale Farbe (z.B. Kategorie-/Lagerort-/Status-Farbe). */
  color?: string | null;
}

/**
 * Auswahl als farbige Pillen statt Dropdown. Einzelauswahl; mit `allLabel` gibt
 * es eine führende „Alle"-Pille, die auf `null` zurücksetzt. Touch- und
 * tastaturfreundlich, überall im Inventar/Packliste wiederverwendet.
 */
export function PillSelect({
  options,
  value,
  onChange,
  allLabel,
  allowClear = true,
  size = "md",
  className,
}: {
  options: PillOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Wenn gesetzt: führende Pille, die auf null (= alle) setzt. */
  allLabel?: string;
  /** Erneutes Klicken auf die aktive Pille hebt die Auswahl auf. */
  allowClear?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const pad = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs";

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {allLabel !== undefined && (
        <Pill active={value === null} onClick={() => onChange(null)} pad={pad}>
          {allLabel}
        </Pill>
      )}
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pill
            key={opt.value}
            active={active}
            color={opt.color ?? undefined}
            pad={pad}
            onClick={() => onChange(active && allowClear ? null : opt.value)}
          >
            {opt.color && !active && (
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
            )}
            {opt.label}
          </Pill>
        );
      })}
    </div>
  );
}

function Pill({
  active,
  color,
  pad,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  pad: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
        pad,
        active ? "border-transparent text-white" : "border-border text-ink-muted hover:text-ink",
      )}
      style={active ? { backgroundColor: color ?? "#3B82F6" } : undefined}
    >
      {children}
    </button>
  );
}
