import type { StatusOption } from "@/types/database";
import type { SubrentalItem, SubrentalLogistics, SubrentalStatus } from "@/types/database";

/**
 * Status-Kette eines Anmiet-Vorgangs: Entwurf → Angefragt → Bestätigt →
 * Übernommen → Zurückgegeben. Storniert ist jederzeit erreichbar (wie beim
 * Job-Status), deshalb separat am Ende statt in der linearen Kette.
 */
export const SUBRENTAL_STATUS_OPTIONS: StatusOption<SubrentalStatus>[] = [
  { value: "entwurf", label: "Entwurf", colorVar: "ink-muted" },
  { value: "angefragt", label: "Angefragt", colorVar: "status-wartung" },
  { value: "bestaetigt", label: "Bestätigt", colorVar: "accent" },
  { value: "uebernommen", label: "Übernommen", colorVar: "status-ausgeliehen" },
  { value: "zurueckgegeben", label: "Zurückgegeben", colorVar: "status-verfuegbar" },
  { value: "storniert", label: "Storniert", colorVar: "ink-faint" },
];

export const SUBRENTAL_LOGISTICS_OPTIONS: { value: SubrentalLogistics; label: string }[] = [
  { value: "abholung", label: "Abholung" },
  { value: "lieferung_lager", label: "Lieferung ins Lager" },
  { value: "lieferung_location", label: "Lieferung zur Location" },
];

/** Positionssumme = Einkaufspreis je Stück (für den gesamten Zeitraum) · Menge. */
export function subrentalItemTotal(item: Pick<SubrentalItem, "quantity" | "unit_cost">): number {
  return item.unit_cost * item.quantity;
}

/** Einkaufs-Gesamtsumme (netto) eines Anmiet-Vorgangs aus seinen Positionen. */
export function subrentalTotals(items: Pick<SubrentalItem, "quantity" | "unit_cost">[]): { total: number } {
  return { total: items.reduce((sum, item) => sum + subrentalItemTotal(item), 0) };
}

/** Zählt dieser Status als "aktive" Anmietung (nicht storniert)? Für Summen/Filter. */
export function isActiveSubrentalStatus(status: SubrentalStatus): boolean {
  return status !== "storniert";
}
