-- EventTech Manager — Lagerorte als eigene Tabelle (statt Freitext)
-- Bisher war devices.location ein Freitextfeld. Damit Lagerorte als auswählbare
-- „Pillen" funktionieren, brauchen sie eine eigene Tabelle und eine Verknüpfung
-- am Gerät. Die Freitext-Spalte bleibt vorerst als Fallback erhalten.

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text default '#64748b',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_locations_updated_at
  before update on locations
  for each row execute function set_updated_at();

alter table devices
  add column location_id uuid references locations(id) on delete set null;

create index idx_devices_location on devices(location_id);

-- Seed: bestehende Freitext-Lagerorte als Einträge übernehmen und verknüpfen.
insert into locations (name)
  select distinct trim(location)
  from devices
  where location is not null and trim(location) <> ''
  on conflict (name) do nothing;

update devices d
  set location_id = l.id
  from locations l
  where d.location is not null and trim(d.location) = l.name;

-- RLS (Bereich „inventar") + GRANTs (kein Auto-Expose!)
alter table locations enable row level security;
create policy locations_sel on locations for select using (has_area('inventar'));
create policy locations_ins on locations for insert with check (can_edit_area('inventar'));
create policy locations_upd on locations for update using (can_edit_area('inventar')) with check (can_edit_area('inventar'));
create policy locations_del on locations for delete using (can_edit_area('inventar'));

grant select, insert, update, delete on locations to authenticated;
