/**
 * Fortschritt eines Jobs innerhalb seines Zeitraums — für den Instrumenten-Ring
 * auf der Startseite (Nächster Einsatz). Nutzt ausschließlich die echten
 * Start-/Enddaten, nie einen erfundenen Wert.
 *
 * - Vor dem Start: kein Füllstand (`null`) — es gibt schlicht noch nichts, das
 *   "vergangen" wäre.
 * - Am Start- bzw. während des Zeitraums: linearer Anteil der vergangenen Tage.
 * - Nach dem Ende: voll (`1`).
 */
export function jobDateProgress(startDate: string, endDate: string, now: Date = new Date()): number | null {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (today.getTime() < start.getTime()) return null;
  if (today.getTime() >= end.getTime()) return 1;

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = today.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}
