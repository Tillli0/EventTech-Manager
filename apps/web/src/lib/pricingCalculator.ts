/**
 * Preis rückwärts rechnen: aus bekannten/geschätzten Kosten und einer Wunsch-Marge
 * den nötigen Netto-Verkaufspreis ableiten — die andere Richtung als
 * `lib/jobCosting.ts` (das rechnet vom fertigen Angebot zur Marge, hier rechnet
 * man von der Marge zum Angebotspreis). Reine Hilfsfunktionen, keine eigene
 * Persistenz — das Ergebnis ist nur eine Orientierung beim Angebotschreiben.
 */

/** Nötiger Netto-Verkaufspreis, damit bei gegebenen Kosten die Wunsch-Marge erreicht wird. */
export function suggestedPriceForMargin(costs: number, marginPct: number): number | null {
  if (costs < 0 || marginPct < 0 || marginPct >= 100) return null;
  return costs / (1 - marginPct / 100);
}

/** Marge in Prozent, die ein gegebener Preis bei gegebenen Kosten tatsächlich ergibt. */
export function marginPctForPrice(costs: number, price: number): number | null {
  if (price <= 0) return null;
  return ((price - costs) / price) * 100;
}
