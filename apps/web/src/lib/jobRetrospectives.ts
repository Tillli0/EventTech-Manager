import type { RetrospectiveCandidate } from "@/hooks/useJobRetrospectives";

/**
 * Erfahrungsgedächtnis: „ähnliche frühere Jobs" fürs Planen des nächsten Events.
 * Ähnlichkeit = Anzahl gemeinsamer Gerätekategorien aus der Packliste (grobes,
 * aber robustes Maß — braucht keine manuelle Verschlagwortung). Nur Kandidaten
 * mit mindestens einer gemeinsamen Kategorie zählen als „ähnlich"; bei
 * Gleichstand gewinnt der jüngere Job (aktuellere Erfahrung ist relevanter).
 */
export interface RankedRetrospective {
  candidate: RetrospectiveCandidate;
  overlap: number;
}

export function rankSimilarRetrospectives(
  currentCategoryIds: string[],
  currentJobId: string,
  candidates: RetrospectiveCandidate[],
  limit = 3,
): RankedRetrospective[] {
  const currentSet = new Set(currentCategoryIds);
  if (currentSet.size === 0) return [];

  const ranked = candidates
    .filter((c) => c.jobId !== currentJobId)
    .map((candidate) => ({
      candidate,
      overlap: candidate.categoryIds.filter((id) => currentSet.has(id)).length,
    }))
    .filter((r) => r.overlap > 0);

  ranked.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return a.candidate.jobStartDate < b.candidate.jobStartDate ? 1 : -1;
  });

  return ranked.slice(0, limit);
}

/** Abweichung tatsächlich./.geplant in Stunden — null, wenn eine der beiden Zahlen fehlt. */
export function hoursDelta(plannedHours: number | null, actualHours: number | null): number | null {
  if (plannedHours === null || actualHours === null) return null;
  return actualHours - plannedHours;
}
