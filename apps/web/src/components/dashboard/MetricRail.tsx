import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

/**
 * Das Zahlenband der Startseite.
 *
 * Vorher standen die Kennzahlen in fünf gleich aussehenden Karten mit Rahmen,
 * Icon-Kachel und Schatten — fünf Kästen, die sich gegenseitig Aufmerksamkeit
 * wegnehmen und optisch genauso schwer wogen wie der nächste Einsatz. Hier sind
 * es nur noch Zahlen auf dem Seitengrund, oben und unten von einer Haarlinie
 * gefasst und untereinander durch Haarlinien getrennt.
 *
 * Farbe bekommt eine Kennzahl nur, wenn sie etwas fordert (überfällig, offen) —
 * nie zur Dekoration.
 */

export interface Metric {
  /** Beschriftung über der Zahl. */
  label: string;
  /** Fertig formatierter Wert (Betrag, Anzahl). */
  value: string;
  /** Einordnende Unterzeile. */
  sub: string;
  /** Unterzeile einfärben, wenn sie eine Handlung fordert. */
  alarm?: boolean;
  to: string;
}

export function MetricRail({ metrics }: { metrics: Metric[] }) {
  return (
    <div
      className={cn(
        // gap-px + eingefärbter Untergrund erzeugt die Trennlinien auch dann
        // sauber, wenn das Band auf schmalen Bildschirmen umbricht.
        "grid grid-cols-2 gap-px border-y border-border bg-border sm:grid-cols-3",
        metrics.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {metrics.map((m) => (
        <Link
          key={m.label}
          to={m.to}
          className="bg-bg px-4 py-3 transition-colors duration-150 ease-out hover:bg-bg-raised focus-visible:bg-bg-raised"
        >
          <p className="truncate text-xs text-ink-muted">{m.label}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {m.value}
          </p>
          <p className={cn("mt-0.5 truncate text-xs", m.alarm ? "font-medium text-status-defekt" : "text-ink-faint")}>
            {m.sub}
          </p>
        </Link>
      ))}
    </div>
  );
}
