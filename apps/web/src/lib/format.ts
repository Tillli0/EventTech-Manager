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
