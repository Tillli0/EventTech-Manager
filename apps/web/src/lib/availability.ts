import type { Device, JobStatus, SubrentalStatus } from "@/types/database";

// ============================================================
// Verfügbarkeits-Engine (Zeitraum-basiert)
//
// Kernfrage: „Wie viel von Gerät X ist im Zeitraum [a, b] bereits durch andere
// Jobs gebunden?" Datengrundlage sind die Packlisten aller Jobs, deren Zeitraum
// den angefragten überlappt und deren Status Bestand bindet. Sets sind hier kein
// Thema mehr: sie werden beim Hinzufügen zur Packliste in Einzelgeräte entpackt
// (siehe useAddDeviceSetToJob), Packlisten enthalten also immer nur Geräte.
// ============================================================

/**
 * Job-Status, die Bestand binden (Zeitraum-Reservierung). Bewusst inklusive
 * „anfrage": auch eine unbestätigte Anfrage reserviert konservativ, damit
 * nie versehentlich doppelt zugesagt wird. „abgeschlossen"/„storniert" geben
 * den Bestand frei.
 */
export const STOCK_BINDING_STATUSES = [
  "anfrage",
  "bestaetigt",
  "planung",
  "packen",
  "laeuft",
  "rueckgabe",
] as const satisfies readonly JobStatus[];

export function bindsStock(status: JobStatus): boolean {
  return (STOCK_BINDING_STATUSES as readonly JobStatus[]).includes(status);
}

/**
 * Subrental-Status, die als Verfügbarkeits-**Zugang** zählen (E3). Konservativitäts-
 * Symmetrie zu `STOCK_BINDING_STATUSES`: Eigenbestand bindet schon ab „anfrage"
 * (konservativ), Anmiet-Zugänge zählen dagegen erst, sobald der Verleiher wirklich
 * zugesagt hat — „entwurf"/„angefragt" sind noch nicht verlässlich, „storniert" zählt
 * nie.
 */
export const SUBRENTAL_COUNTING_STATUSES = [
  "bestaetigt",
  "uebernommen",
  "zurueckgegeben",
] as const satisfies readonly SubrentalStatus[];

export function countsAsSubrentalAddition(status: SubrentalStatus): boolean {
  return (SUBRENTAL_COUNTING_STATUSES as readonly SubrentalStatus[]).includes(status);
}

/** Eine fremde Buchung eines Geräts (Packlist-Posten eines überlappenden Jobs). */
export interface DeviceBooking {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  quantity: number;
  status?: JobStatus;
}

/**
 * Überlappen sich zwei Zeiträume? Jobs sind tagesbasiert gespeichert
 * (Start = Tagesbeginn, Ende = Tagesende), daher genügt der reine
 * Zeitstempel-Vergleich: a beginnt vor dem Ende von b UND a endet nach dem
 * Beginn von b. Ein gemeinsamer Randtag zählt als Überlappung (das Gerät
 * kann nicht am selben Tag auf zwei Veranstaltungen sein).
 */
export function rangesOverlap(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date,
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as <= be && ae >= bs;
}

/** Summe der gebuchten Mengen aus einer Liste von Buchungen. */
export function sumBookedQuantity(bookings: { quantity: number }[] | undefined): number {
  return bookings?.reduce((sum, b) => sum + b.quantity, 0) ?? 0;
}

/**
 * Frei verfügbare Stückzahl eines Geräts im Zeitraum:
 * Lagerbestand − dauerhaft defekt + Anmiet-Zugänge (E3) − durch fremde überlappende
 * Jobs gebunden. Nie negativ (0 = ausgebucht/überbucht). `subrentalAdditions` fließt
 * VOR dem Nullpunkt-Deckel ein, damit die Anmietung echte zusätzliche Kapazität
 * gegen die Fremdbuchungen stellt (nicht nur additiv auf ein schon gedeckeltes „frei").
 */
export function availableInRange(
  device: Pick<Device, "stock_quantity" | "defective_quantity">,
  otherBookings: { quantity: number }[] | undefined,
  subrentalAdditions = 0,
): number {
  return Math.max(
    0,
    device.stock_quantity - (device.defective_quantity ?? 0) + subrentalAdditions - sumBookedQuantity(otherBookings),
  );
}

/** Ergebnis der Konfliktprüfung eines Packlist-Postens gegen den Zeitraum. */
export interface AvailabilityCheck {
  /** Frei im Zeitraum (ohne die eigene gewünschte Menge), inkl. Anmiet-Zugänge. */
  free: number;
  /** Gewünschte Menge übersteigt die freie Menge? */
  over: boolean;
  /** Um wie viele Stück wird überbucht (0 wenn kein Konflikt). */
  shortfall: number;
  /** Die verursachenden fremden Buchungen, nach Startdatum sortiert. */
  conflicts: DeviceBooking[];
  /** Davon aus bestätigten/übernommenen/zurückgegebenen Anmietungen im Zeitraum (E3). */
  subrentalAdditions: number;
}

/**
 * Prüft eine gewünschte Menge gegen Bestand + Anmiet-Zugänge (E3) + fremde Buchungen
 * im Zeitraum. `conflicts` ist nur gefüllt, wenn tatsächlich überbucht wird — für die
 * Anzeige „auch verplant in: …".
 */
export function checkAvailability(
  device: Pick<Device, "stock_quantity" | "defective_quantity">,
  wantedQuantity: number,
  otherBookings: DeviceBooking[] | undefined,
  subrentalAdditions = 0,
): AvailabilityCheck {
  const free = availableInRange(device, otherBookings, subrentalAdditions);
  const shortfall = Math.max(0, wantedQuantity - free);
  const conflicts =
    shortfall > 0
      ? [...(otherBookings ?? [])].sort((a, b) => a.start_date.localeCompare(b.start_date))
      : [];
  return { free, over: shortfall > 0, shortfall, conflicts, subrentalAdditions };
}
