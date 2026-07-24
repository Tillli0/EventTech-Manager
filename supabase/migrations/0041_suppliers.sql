-- 0041: Verleih-Partner-Stamm `suppliers` (Block B / E1).
--
-- Fundament für die Anmietung: bevor Anmiet-Vorgänge (E2), Bestell-PDFs (E4) und
-- die Kalkulation (E7) entstehen können, braucht es einen Stammdaten-Ort für die
-- Verleih-Partner, bei denen Till Technik anmietet. Analog zu `customers`
-- (0001_phase1_schema.sql), aber ohne CRM-Pipeline — reine Adress-/Kontaktdaten.
--
-- Rechte: eigener Bereich `anmietung` (Migration 0040), sichtbar/bearbeitbar wie
-- jede andere area-gated Tabelle (Muster 0012_auth_roles_and_access.sql).
-- Bewusst KEIN `on delete restrict` von einer referenzierenden Tabelle hier —
-- der FK von `subrentals` auf `suppliers` kommt erst mit E2.

-- ============================================================
-- TABELLE
-- ============================================================

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint chk_suppliers_name check (name <> ''),
  contact_person text,
  email text,
  phone text,
  street text,
  zip text,
  city text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_suppliers_updated_at
  before update on suppliers
  for each row execute function set_updated_at();

create index idx_suppliers_name_trgm on suppliers using gin (name gin_trgm_ops);

-- ============================================================
-- RLS
-- ============================================================

alter table suppliers enable row level security;

create policy suppliers_sel on suppliers for select
  using (has_area('anmietung'));
create policy suppliers_ins on suppliers for insert
  with check (can_edit_area('anmietung'));
create policy suppliers_upd on suppliers for update
  using (can_edit_area('anmietung'))
  with check (can_edit_area('anmietung'));
create policy suppliers_del on suppliers for delete
  using (can_edit_area('anmietung'));

-- OHNE GRANTs: still leere Daten/403! Nie anon (0030 haelt anon leer).
grant select, insert, update, delete on suppliers to authenticated;
grant all on suppliers to service_role;

notify pgrst, 'reload schema';
