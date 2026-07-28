-- 0050: Orte als eigener Eintrag (PLAN-EVENT-PLANUNG.md P1).
--
-- Design-Entscheidungen:
-- * Neue Tabelle "venues" statt Erweiterung von "locations" — locations sind die
--   Lagerorte fuer Inventar (devices.location_id), ein Event-Ort ist etwas anderes.
-- * jobs.location (Freitext) bleibt bestehen (non-destruktiv) und dient als
--   Fallback fuer Altdaten/Jobs ohne festen Ort. Gegen Doppelpflege: sobald
--   venue_id gesetzt ist, zeigt die Oberflaeche nur noch den Ort-Eintrag.
-- * Ein Ort ist Betriebswissen, kein persoenliches Datum -> normales Hausmuster
--   has_area('jobs')/can_edit_area('jobs'), kein neuer app_area-Wert noetig.

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint chk_venues_name check (name <> ''),
  address_street text,
  address_zip text,
  address_city text,
  contact_person text,
  contact_phone text,
  access_notes text,
  parking_notes text,
  power_notes text,
  special_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_venues_updated_at
  before update on venues
  for each row execute function set_updated_at();

create index idx_venues_name_trgm on venues using gin (name gin_trgm_ops);

alter table jobs add column venue_id uuid references venues(id) on delete set null;
create index idx_jobs_venue on jobs(venue_id);

-- ============================================================
-- RLS
-- ============================================================

alter table venues enable row level security;

create policy venues_sel on venues for select using (has_area('jobs'));
create policy venues_ins on venues for insert with check (can_edit_area('jobs'));
create policy venues_upd on venues for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy venues_del on venues for delete using (can_edit_area('jobs'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select, insert, update, delete on venues to authenticated;
grant all on venues to service_role;

notify pgrst, 'reload schema';
