-- EventTech Manager — Phase 1 Schema
-- Inventar, Barcode, Jobs, Packlisten, Kunden, CRM-Pipeline, Kalender

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type device_status as enum (
  'verfuegbar',
  'ausgeliehen',
  'defekt',
  'wartung'
);

create type job_status as enum (
  'anfrage',
  'bestaetigt',
  'laeuft',
  'abgeschlossen',
  'storniert'
);

create type customer_source as enum (
  'whatsapp',
  'instagram',
  'email',
  'kontaktformular',
  'telefon',
  'sonstiges'
);

create type inquiry_pipeline_status as enum (
  'neu',
  'in_bearbeitung',
  'angebot_gesendet',
  'gewonnen',
  'verloren'
);

create type task_priority as enum (
  'niedrig',
  'normal',
  'hoch',
  'dringend'
);

create type calendar_source as enum (
  'intern',
  'google',
  'ical'
);

-- ============================================================
-- TRIGGER HELPER: updated_at automatisch setzen
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- CATEGORIES
-- ============================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references categories(id) on delete set null,
  sort_order integer not null default 0,
  color text default '#64748b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, parent_id)
);

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function set_updated_at();

create index idx_categories_parent on categories(parent_id);

-- ============================================================
-- DEVICES (Einzelgeräte)
-- ============================================================

create table devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  manufacturer text,
  model text,
  serial_number text,
  status device_status not null default 'verfuegbar',
  location text,
  purchase_date date,
  purchase_price numeric(10, 2),
  replacement_value numeric(10, 2),
  notes text,
  is_set boolean not null default false,
  set_parent_id uuid references devices(id) on delete set null,
  weight_kg numeric(6, 2),
  power_watts integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_devices_updated_at
  before update on devices
  for each row execute function set_updated_at();

create index idx_devices_category on devices(category_id);
create index idx_devices_status on devices(status);
create index idx_devices_set_parent on devices(set_parent_id);

create extension if not exists pg_trgm;

create index idx_devices_name_trgm
  on devices using gin (name gin_trgm_ops);


-- ============================================================
-- BARCODES (1:n zu devices, falls Geräte mehrere Codes haben können)
-- ============================================================

create table barcodes (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  code text not null unique,
  symbology text not null default 'code128',
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_barcodes_device on barcodes(device_id);
create index idx_barcodes_code on barcodes(code);

-- ============================================================
-- DEVICE PHOTOS (Storage-Referenzen)
-- ============================================================

create table device_photos (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  storage_path text not null,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_device_photos_device on device_photos(device_id);

-- ============================================================
-- DEVICE DOCUMENTS (Handbücher, Rechnungen, Zertifikate, etc.)
-- ============================================================

create table device_documents (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  title text not null,
  storage_path text not null,
  file_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index idx_device_documents_device on device_documents(device_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================

create table customers (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  address_street text,
  address_zip text,
  address_city text,
  address_country text default 'Deutschland',
  source customer_source not null default 'sonstiges',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_customer_has_name check (
    company_name is not null or first_name is not null or last_name is not null
  )
);

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

create index idx_customers_email on customers(email);
create index idx_customers_name_trgm on customers using gin (
  (coalesce(company_name, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, '')) gin_trgm_ops
);

-- ============================================================
-- CUSTOMER INQUIRIES (CRM-Pipeline / Kanban)
-- ============================================================

create table customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  title text not null,
  pipeline_status inquiry_pipeline_status not null default 'neu',
  event_date date,
  budget_estimate numeric(10, 2),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_customer_inquiries_updated_at
  before update on customer_inquiries
  for each row execute function set_updated_at();

create index idx_inquiries_customer on customer_inquiries(customer_id);
create index idx_inquiries_status on customer_inquiries(pipeline_status);

-- ============================================================
-- CUSTOMER NOTES (Verlauf / Aktivitäten pro Kunde)
-- ============================================================

create table customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  inquiry_id uuid references customer_inquiries(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_customer_notes_customer on customer_notes(customer_id);

-- ============================================================
-- JOBS
-- ============================================================

create table jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_id uuid references customers(id) on delete set null,
  inquiry_id uuid references customer_inquiries(id) on delete set null,
  status job_status not null default 'anfrage',
  location text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  pickup_at timestamptz,
  return_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_job_dates check (end_date >= start_date)
);

create trigger trg_jobs_updated_at
  before update on jobs
  for each row execute function set_updated_at();

create index idx_jobs_customer on jobs(customer_id);
create index idx_jobs_status on jobs(status);
create index idx_jobs_dates on jobs(start_date, end_date);

-- ============================================================
-- PACKLIST ITEMS (Geräte pro Job, inkl. Ausgabe/Rückgabe-Tracking)
-- ============================================================

create table packlist_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  device_id uuid not null references devices(id) on delete restrict,
  quantity integer not null default 1,
  picked_up_at timestamptz,
  returned_at timestamptz,
  is_damaged_on_return boolean not null default false,
  damage_notes text,
  created_at timestamptz not null default now(),
  unique (job_id, device_id)
);

create index idx_packlist_job on packlist_items(job_id);
create index idx_packlist_device on packlist_items(device_id);

-- ============================================================
-- CALENDAR ENTRIES (interne Termine + Sync-Referenzen)
-- ============================================================

create table calendar_entries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  source calendar_source not null default 'intern',
  external_event_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_calendar_dates check (end_at >= start_at)
);

create trigger trg_calendar_entries_updated_at
  before update on calendar_entries
  for each row execute function set_updated_at();

create index idx_calendar_job on calendar_entries(job_id);
create index idx_calendar_dates on calendar_entries(start_at, end_at);
create unique index idx_calendar_external on calendar_entries(source, external_event_id)
  where external_event_id is not null;

-- ============================================================
-- VIEW: Geräteverfügbarkeit für einen Zeitraum
-- Nützlich für die Verfügbarkeitsprüfung beim Packen
-- ============================================================

create or replace view device_bookings as
select
  pi.device_id,
  pi.job_id,
  j.title as job_title,
  j.start_date,
  j.end_date,
  j.status as job_status
from packlist_items pi
join jobs j on j.id = pi.job_id
where j.status in ('anfrage', 'bestaetigt', 'laeuft');
