-- 0042: Anmiet-Vorgänge am Job (Block B / E2).
--
-- Kern von "Anmietung so umfänglich wie möglich": ein Anmiet-Vorgang je Lieferant
-- und Zeitraum, mit eigener Status-Kette und Positionen (Katalog-Gerät oder
-- Freitext). Vorgangs-Kopf + Positionen statt flach am Job (Muster
-- offers/offer_items), weil die spätere Bestell-PDF-Klammer (E4) und die
-- Status-Kette einen eigenen Vorgang verlangen (siehe PLAN-NEUAUSRICHTUNG.md F1).
--
-- `order_number` bleibt in E2 ungenutzt (nullable) — die AM-Nummer wird erst mit
-- der Bestell-PDF-Erzeugung (E4) vergeben, analog den AN-Nummern bei Angeboten.
-- `unit_cost` ist der Einkaufspreis je Stück FÜR DEN GESAMTEN ZEITRAUM (nicht pro
-- Tag) — anders als offer_items/rental_days, weil Verleiher i.d.R. pauschal für
-- den Zeitraum abrechnen.

-- ============================================================
-- TABELLEN
-- ============================================================

create table subrentals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete restrict,
  status text not null default 'entwurf' constraint chk_subrentals_status
    check (status in ('entwurf', 'angefragt', 'bestaetigt', 'uebernommen', 'zurueckgegeben', 'storniert')),
  start_date date not null,
  end_date date not null,
  constraint chk_subrentals_date_range check (end_date >= start_date),
  logistics text not null default 'abholung' constraint chk_subrentals_logistics
    check (logistics in ('abholung', 'lieferung_lager', 'lieferung_location')),
  order_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_subrentals_updated_at
  before update on subrentals
  for each row execute function set_updated_at();

create index idx_subrentals_job on subrentals(job_id);
create index idx_subrentals_supplier on subrentals(supplier_id);
-- Nur belegte Nummern müssen eindeutig sein (die meisten Vorgänge haben in E2 noch keine).
create unique index idx_subrentals_order_number on subrentals(order_number) where order_number is not null;

create table subrental_items (
  id uuid primary key default gen_random_uuid(),
  subrental_id uuid not null references subrentals(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  description text not null constraint chk_subrental_items_description check (description <> ''),
  quantity int not null constraint chk_subrental_items_quantity check (quantity > 0),
  unit_cost numeric(10, 2) not null default 0 constraint chk_subrental_items_unit_cost check (unit_cost >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_subrental_items_subrental on subrental_items(subrental_id);
create index idx_subrental_items_device on subrental_items(device_id);

-- ============================================================
-- RLS (Bereich 'anmietung', wie suppliers — kein Job-Sichtbezug: wer Anmietung
-- sehen/bearbeiten darf, sieht/bearbeitet alle Anmiet-Vorgänge, unabhängig von
-- eigener Job-Zuweisung; Einkaufspreise sind ohnehin nur für 'anmietung' sichtbar)
-- ============================================================

alter table subrentals enable row level security;

create policy subrentals_sel on subrentals for select
  using (has_area('anmietung'));
create policy subrentals_ins on subrentals for insert
  with check (can_edit_area('anmietung'));
create policy subrentals_upd on subrentals for update
  using (can_edit_area('anmietung'))
  with check (can_edit_area('anmietung'));
create policy subrentals_del on subrentals for delete
  using (can_edit_area('anmietung'));

grant select, insert, update, delete on subrentals to authenticated;
grant all on subrentals to service_role;

alter table subrental_items enable row level security;

create policy subrental_items_sel on subrental_items for select
  using (has_area('anmietung'));
create policy subrental_items_ins on subrental_items for insert
  with check (can_edit_area('anmietung'));
create policy subrental_items_upd on subrental_items for update
  using (can_edit_area('anmietung'))
  with check (can_edit_area('anmietung'));
create policy subrental_items_del on subrental_items for delete
  using (can_edit_area('anmietung'));

grant select, insert, update, delete on subrental_items to authenticated;
grant all on subrental_items to service_role;

notify pgrst, 'reload schema';
