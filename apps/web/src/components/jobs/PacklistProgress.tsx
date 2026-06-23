import type { PacklistItem } from "@/types/database";

/**
 * Kompakter Fortschritt einer Packliste über alle Posten aggregiert:
 * wie viel ist abgeholt, wie viel (intakt/defekt/fehlend) zurück.
 * Ein gestapelter Balken zeigt den Zustand auf einen Blick.
 */
export function PacklistProgress({ items }: { items: PacklistItem[] }) {
  if (!items.length) return null;

  const sum = (pick: (i: PacklistItem) => number) => items.reduce((acc, i) => acc + (pick(i) || 0), 0);
  const total = sum((i) => i.quantity);
  const picked = sum((i) => i.quantity_picked_up);
  const returnedOk = sum((i) => i.quantity_returned_ok);
  const damaged = sum((i) => i.quantity_damaged);
  const missing = sum((i) => i.quantity_missing);
  const returned = returnedOk + damaged + missing;
  const pickedOpen = Math.max(0, picked - returned); // abgeholt, noch nicht zurück

  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;

  const allBack = returned >= picked && picked > 0;
  const phase = picked === 0 ? "Noch nichts abgeholt" : allBack ? "Alles zurück" : `${picked}/${total} abgeholt`;

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-raised p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-medium text-ink">{phase}</span>
        {returned > 0 && <span className="text-ink-muted">zurück: {returned}</span>}
        {damaged > 0 && <span className="font-medium text-status-defekt">defekt: {damaged}</span>}
        {missing > 0 && <span className="font-medium text-status-wartung">fehlt: {missing}</span>}
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border" title={`${total} gesamt`}>
        <div className="h-full bg-status-verfuegbar" style={{ width: pct(returnedOk) }} title={`intakt zurück: ${returnedOk}`} />
        <div className="h-full bg-status-defekt" style={{ width: pct(damaged) }} title={`defekt: ${damaged}`} />
        <div className="h-full bg-status-wartung" style={{ width: pct(missing) }} title={`fehlt: ${missing}`} />
        <div className="h-full bg-accent" style={{ width: pct(pickedOpen) }} title={`abgeholt, noch nicht zurück: ${pickedOpen}`} />
      </div>
    </div>
  );
}
