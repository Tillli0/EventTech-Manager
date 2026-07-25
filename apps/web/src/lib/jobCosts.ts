import type { JobCost } from "@/types/database";

/** Summe aller Kosten-Positionen eines Jobs (netto). */
export function jobCostsTotal(costs: Pick<JobCost, "amount">[]): number {
  return costs.reduce((sum, c) => sum + c.amount, 0);
}
