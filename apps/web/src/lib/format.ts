import { format, parseISO, isValid } from "date-fns";
import { de } from "date-fns/locale";

/** Formatiert ein ISO-Datum/Zeitstring als DD.MM.YYYY */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "—";
  return format(date, "dd.MM.yyyy", { locale: de });
}

/** Formatiert ein ISO-Datum/Zeitstring als DD.MM.YYYY HH:mm */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "—";
  return format(date, "dd.MM.yyyy HH:mm", { locale: de });
}

/** Formatiert nur die Uhrzeit als HH:mm */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "—";
  return format(date, "HH:mm", { locale: de });
}

/** Formatiert einen Betrag als deutsche Währung (1.234,56 €) */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/** Formatiert eine Zahl mit deutschen Tausendertrennzeichen */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("de-DE").format(value);
}

/** Initialen aus einem Namen (max. 2 Buchstaben) — für Avatar-Kreise. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Formatiert eine Dateigröße in Bytes lesbar (deutsch, 1 Nachkommastelle,
 * ganze Bytes ohne Komma): 0 B, 532 B, 1,5 KB, 4,8 MB.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(size);
  return `${formatted} ${units[unit]}`;
}
