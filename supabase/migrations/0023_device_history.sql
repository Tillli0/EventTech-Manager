-- EventTech Manager — Geräte-Historie (Verlauf / Audit)
-- Wo war ein Gerät, wann, in welchem Job? Append-only Protokoll für
-- Ausgabe/Rückgabe, Defekt-Meldung, Lagerort- und Status-Änderungen.
-- Dient sowohl der Geräte-Historie als auch der Job-Historie (Filter job_id).

create table device_history (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  event_type text not null check (event_type in ('ausgegeben', 'zurueck', 'defekt', 'lagerort', 'status')),
  job_id uuid references jobs(id) on delete set null,
  quantity integer,
  from_location_id uuid references locations(id) on delete set null,
  to_location_id uuid references locations(id) on delete set null,
  note text,
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index idx_device_history_device on device_history(device_id, created_at desc);
create index idx_device_history_job on device_history(job_id);

-- RLS: lesen/schreiben darf, wer den Inventar- ODER Jobs-Bereich bearbeiten darf
-- (Ausgabe/Rückgabe passiert im Job). Append-only: Ändern/Löschen nur Admin.
alter table device_history enable row level security;
create policy device_history_sel on device_history for select using (has_area('inventar') or has_area('jobs'));
create policy device_history_ins on device_history for insert with check (can_edit_area('inventar') or can_edit_area('jobs'));
create policy device_history_admin on device_history for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on device_history to authenticated;
grant select, insert, update, delete on device_history to service_role;
