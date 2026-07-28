/**
 * Reine Differenz-Logik fürs Setzen von Zuweisungen (Job-Crew wie auch
 * Programmpunkt-Crew, PLAN-EVENT-PLANUNG.md P4/E1).
 *
 * Der Grund, warum das eine eigene, getestete Funktion ist und nicht einfach
 * "alte Zeilen löschen, neue einfügen": job_assignees trägt seit E1 Zeiten und
 * Rolle. Ein Löschen-und-Neuanlegen bei jedem Checkbox-Toggle würde diese Werte
 * für JEDE unveränderte Zuweisung stillschweigend auf null zurücksetzen — ein
 * Datenverlust ohne Fehlermeldung, sichtbar erst wenn das Crew-Blatt leer druckt.
 */
export function diffAssigneeIds(
  current: string[],
  next: string[],
): { toAdd: string[]; toRemove: string[] } {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  return {
    toAdd: next.filter((id) => !currentSet.has(id)),
    toRemove: current.filter((id) => !nextSet.has(id)),
  };
}
