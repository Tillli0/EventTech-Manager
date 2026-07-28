import type { JobCost } from "@/types/database";

/** Summe aller Kosten-Positionen eines Jobs (netto). */
export function jobCostsTotal(costs: Pick<JobCost, "amount">[]): number {
  return costs.reduce((sum, c) => sum + c.amount, 0);
}

/** Auf zwei Nachkommastellen runden (Beträge/Stunden) — vermeidet Fließkomma-Reste wie 7.500000001. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Kostenvorschlag aus einer Zuweisung (P4/E2): Stunden aus start_at/end_at,
 * wenn beide gesetzt sind, sonst null (kein Raten). Betrag nur, wenn sowohl
 * Stunden als auch ein Satz bekannt sind — sonst 0 (bewusst keine Erfindung
 * eines Satzes, das war genau die P0-Beschwerde über die 0,00-€-Zeile, nur
 * dass sie jetzt wenigstens die Stunden zeigt, wo vorhanden).
 */
export function suggestCostFromAssignment(
  assignment: { start_at: string | null; end_at: string | null },
  defaultHourlyRate: number | null,
): { hours: number | null; hourly_rate: number | null; amount: number } {
  const hours =
    assignment.start_at && assignment.end_at
      ? round2((new Date(assignment.end_at).getTime() - new Date(assignment.start_at).getTime()) / 3_600_000)
      : null;
  const hourly_rate = defaultHourlyRate;
  const amount = hours != null && hourly_rate != null ? round2(hours * hourly_rate) : 0;
  return { hours, hourly_rate, amount };
}
