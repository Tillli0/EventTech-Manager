import { cn } from "@/lib/cn";

export interface SummaryStat {
  label: string;
  /** Bereits formatiert (Zahl oder Währung), damit die Komponente dumm bleibt. */
  value: string;
  sub?: string;
  tone?: keyof typeof TONE;
}

const TONE = {
  default: "text-ink",
  accent: "text-accent",
  green: "text-status-verfuegbar",
  amber: "text-status-wartung",
  red: "text-status-defekt",
} as const;

/**
 * Kennzahlen-Kopf über Listen (Angebote/Rechnungen): kompakte Kacheln mit
 * Label + Wert + optionaler Unterzeile. Kleinere Geschwister der Dashboard-
 * MetricCards — hier ohne Link/Icon, dafür listen-nah und dicht.
 */
export function SummaryStats({ stats, className }: { stats: SummaryStat[]; className?: string }) {
  if (stats.length === 0) return null;
  return (
    <div className={cn("grid grid-cols-2 gap-3", stats.length >= 4 ? "lg:grid-cols-4" : "sm:grid-cols-3", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border bg-bg-surface px-3.5 py-2.5">
          <p className="text-xs text-ink-muted">{stat.label}</p>
          <p className={cn("mt-1 truncate font-mono text-lg font-semibold", TONE[stat.tone ?? "default"])}>
            {stat.value}
          </p>
          {stat.sub && <p className="mt-0.5 text-xs text-ink-faint">{stat.sub}</p>}
        </div>
      ))}
    </div>
  );
}
