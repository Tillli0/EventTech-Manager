// Kleine Helfer rund um Datum/Uhrzeit für die eigenen Picker-Komponenten.
// Bewusst lokal (kein UTC-Versatz) — der Nutzer denkt in seiner Zeitzone.

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "yyyy-MM-dd" (lokal). */
export function dateToInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date → "HH:mm" (lokal). */
export function timeToInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Tag + "HH:mm" zu einem konkreten Date zusammensetzen. */
export function combineDateAndTime(day: Date, time: string): Date {
  const [h, m] = time.split(":").map((s) => parseInt(s, 10));
  const d = new Date(day);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** ISO/Date robust zu Date — gibt null bei ungültigem Wert. */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
