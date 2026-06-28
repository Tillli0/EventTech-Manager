// EventTech Manager — Domänentypen
// Spiegelt 1:1 das Supabase-Schema aus supabase/migrations/0001_phase1_schema.sql

export type DeviceStatus = "verfuegbar" | "ausgeliehen" | "defekt" | "wartung";

export type JobStatus = "anfrage" | "bestaetigt" | "laeuft" | "abgeschlossen" | "storniert";

export type CustomerSource =
  | "whatsapp"
  | "instagram"
  | "email"
  | "kontaktformular"
  | "telefon"
  | "sonstiges";

export type InquiryPipelineStatus =
  | "neu"
  | "in_bearbeitung"
  | "angebot_gesendet"
  | "gewonnen"
  | "verloren";

export type TaskPriority = "niedrig" | "normal" | "hoch" | "dringend";

export type CalendarSource = "intern" | "google" | "ical";

// ============================================================
// Auth / Rollen / Bereiche
// ============================================================

export type UserRole = "admin" | "verwaltung" | "mitarbeiter";

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "mitarbeiter", label: "Mitarbeiter" },
  { value: "verwaltung", label: "Verwaltung" },
  { value: "admin", label: "Administrator" },
];

/** Sichtmodus für Jobs: welche Jobs ein Nutzer im Bereich „Jobs“ sieht. */
export type JobViewMode = "eigene" | "zugewiesene" | "alle";

export const JOB_VIEW_MODE_OPTIONS: { value: JobViewMode; label: string; hint: string }[] = [
  { value: "zugewiesene", label: "Zugewiesene", hint: "Nur Jobs, denen man zugewiesen ist" },
  { value: "alle", label: "Alle", hint: "Alle Jobs im Bestand" },
];

/** Bereiche, für die der Admin pro Nutzer Lese-/Schreibrechte vergibt. */
export type AppArea = "inventar" | "jobs" | "kunden" | "angebote" | "kalender" | "aufgaben";

export const APP_AREAS: { value: AppArea; label: string }[] = [
  { value: "inventar", label: "Inventar" },
  { value: "jobs", label: "Jobs" },
  { value: "kunden", label: "Kunden" },
  { value: "angebote", label: "Angebote" },
  { value: "kalender", label: "Kalender" },
  { value: "aufgaben", label: "Aufgaben" },
];

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  job_view_mode: JobViewMode;
  created_at: string;
  updated_at: string;
}

export interface UserAreaAccess {
  user_id: string;
  area: AppArea;
  can_edit: boolean;
}

export interface JobAssignee {
  job_id: string;
  user_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  name: string;
  category_id: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  status: DeviceStatus;
  /** Alter Freitext-Lagerort (Fallback). Neue Auswahl läuft über location_id. */
  location: string | null;
  /** Verknüpfter Lagerort (Tabelle locations). Löst den Freitext ab. */
  location_id: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  replacement_value: number | null;
  notes: string | null;
  is_set: boolean;
  set_parent_id: string | null;
  weight_kg: number | null;
  power_watts: number | null;
  /** Gesamtbestand. 1 = Einzelstück (Normalfall), >1 = Mengen-Gerät (z.B. 20 Kabel unter einem Barcode). */
  stock_quantity: number;
  /** Wie viele Einheiten dauerhaft defekt sind (zählt aus der Verfügbarkeit heraus). */
  defective_quantity: number;
  /** Netto-Tagesmietpreis in EUR. Vorbelegung für Angebotspositionen. Null = nicht gepflegt. */
  daily_rental_price: number | null;
  /** Letzte DGUV-V3-Elektroprüfung (Datum). Null = nicht gepflegt / nicht prüfpflichtig. */
  last_inspection_date: string | null;
  /** Nächste fällige DGUV-V3-Prüfung (Datum). Basis für die Erinnerung. */
  next_inspection_date: string | null;
  created_at: string;
  updated_at: string;
  // Joins (optional, je nach Query)
  category?: Category | null;
  /** Verknüpfter Lagerort (alias, um nicht mit dem Freitext-Feld „location" zu kollidieren). */
  location_ref?: Location | null;
  barcodes?: Barcode[];
  device_photos?: DevicePhoto[];
}

/** Aufschlüsselung der Verfügbarkeit eines Geräts (eine Wahrheit). */
export interface DeviceBreakdown {
  total: number;
  defective: number;
  /** Aktuell ausgegeben (über aktive Jobs). */
  out: number;
  /** Frei verfügbar = total − defekt − ausgegeben. */
  available: number;
}

/**
 * Berechnet die Verfügbarkeits-Aufschlüsselung. „outNow" ist die Summe der aktuell
 * über aktive Jobs ausgegebenen Stückzahl (client-seitig ermittelt).
 */
export function deviceBreakdown(
  device: Pick<Device, "stock_quantity" | "defective_quantity">,
  outNow: number,
): DeviceBreakdown {
  const total = device.stock_quantity;
  const defective = device.defective_quantity ?? 0;
  const out = Math.max(0, outNow);
  const available = Math.max(0, total - defective - out);
  return { total, defective, out, available };
}

/** Ist dieses Gerät ein Mengen-Gerät (Stückzahl > 1)? */
export function isQuantityDevice(device: Pick<Device, "stock_quantity">): boolean {
  return device.stock_quantity > 1;
}

/** Status der DGUV-V3-Prüffälligkeit anhand des nächsten Prüfdatums. */
export type InspectionStatus = "none" | "ok" | "soon" | "overdue";

/**
 * Leitet aus dem nächsten Prüfdatum den Fälligkeits-Status ab.
 * „soon" = innerhalb der nächsten `soonDays` Tage fällig (Default 30).
 */
export function inspectionStatus(
  nextDate: string | null | undefined,
  soonDays = 30,
): InspectionStatus {
  if (!nextDate) return "none";
  const next = new Date(`${nextDate}T00:00:00`);
  if (Number.isNaN(next.getTime())) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= soonDays) return "soon";
  return "ok";
}

export const INSPECTION_STATUS_LABELS: Record<Exclude<InspectionStatus, "none">, string> = {
  ok: "Prüfung gültig",
  soon: "Prüfung bald fällig",
  overdue: "Prüfung überfällig",
};

/** Standardfarbe für neue Sets (entspricht dem DB-Default). */
export const DEFAULT_SET_COLOR = "#6366f1";

export interface DeviceSet {
  id: string;
  name: string;
  description: string | null;
  color: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  items?: DeviceSetItem[];
}

export interface DeviceSetItem {
  id: string;
  set_id: string;
  device_id: string;
  quantity: number;
  created_at: string;
  device?: Device;
}

export interface Barcode {
  id: string;
  device_id: string;
  code: string;
  symbology: string;
  is_primary: boolean;
  created_at: string;
}

export interface DevicePhoto {
  id: string;
  device_id: string;
  storage_path: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

export interface DeviceDocument {
  id: string;
  device_id: string;
  title: string;
  storage_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

export interface Customer {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  source: CustomerSource;
  notes: string | null;
  /** Stammkunden-Override: null = automatisch (>=2 Jobs), true = immer, false = nie. */
  is_stammkunde: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Gilt der Kunde als Stammkunde? Manueller Override (is_stammkunde true/false) hat
 * Vorrang; ohne Override automatisch ab 2 nicht-stornierten Jobs.
 */
export function isStammkunde(
  customer: Pick<Customer, "is_stammkunde">,
  jobCount: number,
): boolean {
  return customer.is_stammkunde ?? jobCount >= 2;
}

export interface CustomerInquiry {
  id: string;
  customer_id: string;
  title: string;
  pipeline_status: InquiryPipelineStatus;
  event_date: string | null;
  budget_estimate: number | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  inquiry_id: string | null;
  content: string;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  customer_id: string | null;
  inquiry_id: string | null;
  status: JobStatus;
  location: string | null;
  start_date: string;
  end_date: string;
  pickup_at: string | null;
  return_at: string | null;
  notes: string | null;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  packlist_items?: PacklistItem[];
  milestones?: JobMilestone[];
  assignees?: JobAssignee[];
}

export interface JobMilestone {
  id: string;
  job_id: string;
  title: string;
  at: string;
  created_at: string;
}

/**
 * Ist ein Job komplett in der Vergangenheit? = der späteste relevante Zeitpunkt
 * (Enddatum, Rückgabe-Termin sowie alle Zeitplan-Termine, die ja auch nach dem
 * Enddatum liegen können) liegt vor dem heutigen Tagesbeginn. Solche Jobs wandern
 * in der Jobliste in den „Vergangen"-Ordner.
 */
export function isJobCompletelyPast(job: Job, now: Date = new Date()): boolean {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  let latest = new Date(job.end_date).getTime();
  if (job.return_at) latest = Math.max(latest, new Date(job.return_at).getTime());
  for (const m of job.milestones ?? []) latest = Math.max(latest, new Date(m.at).getTime());
  return latest < todayStart.getTime();
}

export interface PacklistItem {
  id: string;
  job_id: string;
  device_id: string;
  /** Gebuchte/gewünschte Menge für diesen Job. */
  quantity: number;
  /** Tatsächlich ausgegebene Menge (kann in Schritten erfolgen, max. = quantity). */
  quantity_picked_up: number;
  /** Davon intakt zurückgegeben. */
  quantity_returned_ok: number;
  /** Davon defekt zurückgegeben. */
  quantity_damaged: number;
  /** Davon fehlend/nicht zurückgekommen. */
  quantity_missing: number;
  picked_up_at: string | null;
  returned_at: string | null;
  is_damaged_on_return: boolean;
  damage_notes: string | null;
  created_at: string;
  device?: Device;
}

/** Wie viele Stück sind noch ausgegeben und noch nicht (vollständig) zurückgemeldet? */
export function quantityStillOut(item: Pick<PacklistItem, "quantity_picked_up" | "quantity_returned_ok" | "quantity_damaged" | "quantity_missing">): number {
  return item.quantity_picked_up - item.quantity_returned_ok - item.quantity_damaged - item.quantity_missing;
}

/** Wie viele Stück sind noch gar nicht ausgegeben? */
export function quantityNotYetPickedUp(item: Pick<PacklistItem, "quantity" | "quantity_picked_up">): number {
  return item.quantity - item.quantity_picked_up;
}

export type DeviceHistoryEventType = "ausgegeben" | "zurueck" | "defekt" | "lagerort" | "status";

export interface DeviceHistory {
  id: string;
  device_id: string;
  event_type: DeviceHistoryEventType;
  job_id: string | null;
  quantity: number | null;
  from_location_id: string | null;
  to_location_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  // Joins (optional, je nach Query)
  job?: { id: string; title: string } | null;
  from_location?: Location | null;
  to_location?: Location | null;
}

export interface CalendarEntry {
  id: string;
  job_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  source: CalendarSource;
  external_event_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  job?: Job | null;
}

export type TaskStatus = "offen" | "in_bearbeitung" | "erledigt";
export type TaskContentType = "notes" | "list";

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  text: string;
  checked: boolean;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  content_type: TaskContentType;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  /** Echte Nutzer-Zuweisung (Profil-ID). Löst das alte Freitext-assigned_to ab. */
  assigned_user_id: string | null;
  /** Ersteller (Profil-ID). Jeder darf eigene Tasks anlegen/sehen. */
  created_by: string | null;
  due_date: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
  job?: Job | null;
  assigned_user?: Profile | null;
  checklist_items?: TaskChecklistItem[];
}

// ============================================================
// Angebote
// ============================================================

export type OfferStatus = "entwurf" | "gesendet" | "angenommen" | "abgelehnt";

export interface Offer {
  id: string;
  offer_number: string;
  customer_id: string | null;
  inquiry_id: string | null;
  /** Optional verknüpfter Job (z.B. aus dessen Packliste erzeugt). */
  job_id: string | null;
  title: string;
  status: OfferStatus;
  event_date: string | null;
  valid_until: string | null;
  tax_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins (optional, je nach Query)
  customer?: Customer | null;
  items?: OfferItem[];
}

export interface OfferItem {
  id: string;
  offer_id: string;
  device_id: string | null;
  description: string;
  quantity: number;
  rental_days: number;
  unit_price: number;
  sort_order: number;
  created_at: string;
}

/** Positionssumme (netto) = Einzelpreis · Menge · Miettage. */
export function offerItemTotal(item: Pick<OfferItem, "quantity" | "rental_days" | "unit_price">): number {
  return item.unit_price * item.quantity * item.rental_days;
}

/** Netto-/MwSt-/Brutto-Summen eines Angebots aus seinen Positionen + Steuersatz. */
export function offerTotals(
  items: Pick<OfferItem, "quantity" | "rental_days" | "unit_price">[],
  taxRate: number,
): { net: number; tax: number; gross: number } {
  const net = items.reduce((sum, item) => sum + offerItemTotal(item), 0);
  const tax = net * (taxRate / 100);
  return { net, tax, gross: net + tax };
}

// ============================================================
// UI-Hilfstypen
// ============================================================

export interface StatusOption<T extends string> {
  value: T;
  label: string;
  colorVar: string;
  bgVar?: string;
}

export const DEVICE_STATUS_OPTIONS: StatusOption<DeviceStatus>[] = [
  { value: "verfuegbar", label: "Verfügbar", colorVar: "status-verfuegbar", bgVar: "status-verfuegbar-bg" },
  { value: "ausgeliehen", label: "Ausgeliehen", colorVar: "status-ausgeliehen", bgVar: "status-ausgeliehen-bg" },
  { value: "defekt", label: "Defekt", colorVar: "status-defekt", bgVar: "status-defekt-bg" },
  { value: "wartung", label: "Wartung", colorVar: "status-wartung", bgVar: "status-wartung-bg" },
];

export const JOB_STATUS_OPTIONS: StatusOption<JobStatus>[] = [
  { value: "anfrage", label: "Anfrage", colorVar: "job-anfrage" },
  { value: "bestaetigt", label: "Bestätigt", colorVar: "job-bestaetigt" },
  { value: "laeuft", label: "Läuft", colorVar: "job-laeuft" },
  { value: "abgeschlossen", label: "Abgeschlossen", colorVar: "job-abgeschlossen" },
  { value: "storniert", label: "Storniert", colorVar: "job-storniert" },
];

export const INQUIRY_PIPELINE_OPTIONS: StatusOption<InquiryPipelineStatus>[] = [
  { value: "neu", label: "Neu", colorVar: "ink-muted" },
  { value: "in_bearbeitung", label: "In Bearbeitung", colorVar: "accent" },
  { value: "angebot_gesendet", label: "Angebot gesendet", colorVar: "status-wartung" },
  { value: "gewonnen", label: "Gewonnen", colorVar: "status-verfuegbar" },
  { value: "verloren", label: "Verloren", colorVar: "status-defekt" },
];

export const OFFER_STATUS_OPTIONS: StatusOption<OfferStatus>[] = [
  { value: "entwurf", label: "Entwurf", colorVar: "ink-muted" },
  { value: "gesendet", label: "Gesendet", colorVar: "status-wartung" },
  { value: "angenommen", label: "Angenommen", colorVar: "status-verfuegbar" },
  { value: "abgelehnt", label: "Abgelehnt", colorVar: "status-defekt" },
];

export const TASK_STATUS_OPTIONS: StatusOption<TaskStatus>[] = [
  { value: "offen", label: "Offen", colorVar: "ink-muted" },
  { value: "in_bearbeitung", label: "In Bearbeitung", colorVar: "status-wartung" },
  { value: "erledigt", label: "Erledigt", colorVar: "status-verfuegbar" },
];

export const TASK_PRIORITY_OPTIONS: StatusOption<TaskPriority>[] = [
  { value: "niedrig", label: "Niedrig", colorVar: "ink-faint" },
  { value: "normal", label: "Normal", colorVar: "ink-muted" },
  { value: "hoch", label: "Hoch", colorVar: "status-wartung" },
  { value: "dringend", label: "Dringend", colorVar: "status-defekt" },
];

export const CUSTOMER_SOURCE_LABELS: Record<CustomerSource, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-Mail",
  kontaktformular: "Kontaktformular",
  telefon: "Telefon",
  sonstiges: "Sonstiges",
};

/**
 * Feste Farbpalette für Jobs (Kalenderdarstellung). Bei der Job-Erstellung wird
 * automatisch eine Farbe zufällig zugewiesen, im Job kann sie danach geändert werden.
 */
export const JOB_COLOR_PALETTE: string[] = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
];

export function randomJobColor(): string {
  return JOB_COLOR_PALETTE[Math.floor(Math.random() * JOB_COLOR_PALETTE.length)];
}
