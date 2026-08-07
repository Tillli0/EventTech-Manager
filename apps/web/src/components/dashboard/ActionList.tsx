import { Link } from "react-router-dom";
import { AlertCircle, ListChecks, Receipt, Truck, Globe, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActionItem, ActionKind } from "@/lib/dashboardActions";

/**
 * „Was jetzt zählt" — eine Liste statt vier Kästen.
 *
 * Überfällige Aufgaben, offene Rechnungen, unbestätigte Anmietungen und neue
 * Anfragen standen bisher in vier gleich aussehenden Boxen nebeneinander. Wer
 * morgens hier ankommt, will aber nicht vier Listen vergleichen, sondern eine
 * Reihenfolge sehen. Die Sortierlogik liegt in `lib/dashboardActions.ts`.
 */

const ICONS: Record<ActionKind, LucideIcon> = {
  aufgabe: ListChecks,
  rechnung: Receipt,
  anmietung: Truck,
  anfrage: Globe,
};

function ActionRow({ item }: { item: ActionItem }) {
  const ueberfaellig = item.urgency === "ueberfaellig";
  const Icon = ueberfaellig ? AlertCircle : ICONS[item.kind];

  return (
    <li>
      <Link
        to={item.to}
        className="flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors duration-150 ease-out hover:bg-bg-raised"
      >
        <Icon
          size={15}
          strokeWidth={1.75}
          aria-hidden
          className={cn("shrink-0", ueberfaellig ? "text-status-defekt" : "text-ink-faint")}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{item.title}</p>
          <p className="truncate text-xs text-ink-muted">{item.detail}</p>
        </div>
        <span
          className={cn(
            "shrink-0 font-mono text-xs tabular-nums",
            ueberfaellig ? "font-medium text-status-defekt" : "text-ink-muted",
          )}
        >
          {item.meta}
        </span>
      </Link>
    </li>
  );
}

export function ActionList({ items, max = 6 }: { items: ActionItem[]; max?: number }) {
  const sichtbar = items.slice(0, max);
  const rest = items.length - sichtbar.length;
  const ueberfaellig = items.filter((i) => i.urgency === "ueberfaellig").length;

  return (
    <section aria-labelledby="was-jetzt-zaehlt">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="was-jetzt-zaehlt" className="text-sm font-semibold text-ink">
          Was jetzt zählt
        </h2>
        {ueberfaellig > 0 && (
          <span className="font-mono text-xs tabular-nums font-medium text-status-defekt">
            {ueberfaellig} überfällig
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface px-4 py-5">
          <Check size={16} strokeWidth={2} aria-hidden className="shrink-0 text-status-verfuegbar" />
          <div>
            <p className="text-sm font-medium text-ink">Nichts liegt an.</p>
            <p className="text-xs text-ink-muted">
              Überfällige Aufgaben, offene Rechnungen, unbestätigte Anmietungen und neue Anfragen
              erscheinen hier von selbst.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
          <ol className="divide-y divide-border-subtle">
            {sichtbar.map((item) => (
              <ActionRow key={item.id} item={item} />
            ))}
          </ol>
          {rest > 0 && (
            <p className="border-t border-border-subtle px-4 py-2 text-xs text-ink-faint">
              und {rest} weitere{rest === 1 ? "r" : ""} Punkt{rest === 1 ? "" : "e"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
