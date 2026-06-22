-- EventTech Manager — Angebote (gespeichert, mit fortlaufender Nummer)
-- Phase 3: Aus einer Kundenanfrage wird ein echtes Angebot mit Positionen aus dem
-- Inventar (Preis = Tagesmietpreis, editierbar). Angebote bleiben erhalten, sind
-- erneut als PDF druckbar und setzen die verknüpfte Anfrage auf "angebot_gesendet".

create type offer_status as enum (
  'entwurf',
  'gesendet',
  'angenommen',
  'abgelehnt'
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  offer_number text not null unique,             -- z.B. AN-2026-0001
  customer_id uuid references customers(id) on delete set null,
  inquiry_id uuid references customer_inquiries(id) on delete set null,
  title text not null,
  status offer_status not null default 'entwurf',
  event_date date,
  valid_until date,
  tax_rate numeric not null default 19
    constraint chk_offers_tax_rate_nonneg check (tax_rate >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_offers_updated_at
  before update on offers
  for each row execute function set_updated_at();

create index idx_offers_customer on offers(customer_id);
create index idx_offers_inquiry on offers(inquiry_id);

create table offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  description text not null,                      -- Snapshot des Gerätenamens
  quantity integer not null default 1
    constraint chk_offer_items_quantity_positive check (quantity > 0),
  rental_days integer not null default 1
    constraint chk_offer_items_rental_days_positive check (rental_days > 0),
  unit_price numeric not null default 0           -- Snapshot Tagesmietpreis (editierbar)
    constraint chk_offer_items_unit_price_nonneg check (unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_offer_items_offer on offer_items(offer_id);

comment on column offer_items.description is
  'Snapshot des Gerätenamens zum Zeitpunkt der Angebotserstellung (bleibt auch bei späterer Geräteänderung/-löschung erhalten).';
comment on column offer_items.unit_price is
  'Netto-Einzelpreis pro Tag. Vorbelegt aus devices.daily_rental_price, aber pro Angebot anpassbar.';

-- RLS deaktiviert (konsistent mit dem No-Login-Betrieb, siehe 0006/0009)
alter table offers disable row level security;
alter table offer_items disable row level security;
grant all on offers to anon;
grant all on offers to authenticated;
grant all on offer_items to anon;
grant all on offer_items to authenticated;
