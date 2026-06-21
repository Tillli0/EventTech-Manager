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

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  color: string | null;
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
  location: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  replacement_value: number | null;
  notes: string | null;
  is_set: boolean;
  set_parent_id: string | null;
  weight_kg: number | null;
  power_watts: number | null;
  created_at: string;
  updated_at: string;
  // Joins (optional, je nach Query)
  category?: Category | null;
  barcodes?: Barcode[];
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  packlist_items?: PacklistItem[];
}

export interface PacklistItem {
  id: string;
  job_id: string;
  device_id: string;
  quantity: number;
  picked_up_at: string | null;
  returned_at: string | null;
  is_damaged_on_return: boolean;
  damage_notes: string | null;
  created_at: string;
  device?: Device;
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

export const CUSTOMER_SOURCE_LABELS: Record<CustomerSource, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-Mail",
  kontaktformular: "Kontaktformular",
  telefon: "Telefon",
  sonstiges: "Sonstiges",
};
