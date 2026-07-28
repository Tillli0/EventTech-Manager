-- 0055: Fremdgewerke koordinieren (PLAN-EVENT-PLANUNG.md P5).
--
-- Design-Entscheidungen:
-- * Kein zweiter Partner-Stamm: `suppliers` bekommt ein `trade`-Feld (Gewerk,
--   z.B. "Catering", "Security") statt einer eigenen Fremdgewerke-Tabelle.
-- * `job_services` (job_id, supplier_id, Status, Zeit vor Ort) ist bewusst OHNE
--   Preisspalte — Geld bleibt ausschließlich in `job_costs` (Bereich 'anmietung').
--   Das ist kein Zufall: Koordination ("wer kommt wann") ist Job-Wissen wie
--   `job_milestones`/`job_assignees` (Bereich 'jobs'), der Preis ist kaufmännisch
--   wie `job_costs` (Bereich 'anmietung'). Eine Tabelle kann laut RLS nicht in
--   beiden Bereichen liegen — deshalb zwei Tabellen statt einer Preisspalte hier.
-- * `suppliers` war bisher rein auf 'anmietung' gelesen (Verleih-Partner-Stamm),
--   das reicht für die Koordination nicht: ein Crew-Mitglied mit nur Bereich
--   'jobs' muss sehen können, WELCHER Partner für ein zugesagtes Gewerk gebucht
--   ist (Name, Telefon), sonst wäre `job_services.supplier_id` für sie nur eine
--   nichtssagende ID. Die SELECT-Policy wird deshalb auf 'jobs' ODER 'anmietung'
--   erweitert — anlegen/ändern/löschen von Partnern bleibt exklusiv 'anmietung'.

alter table suppliers add column trade text;

drop policy suppliers_sel on suppliers;
create policy suppliers_sel on suppliers for select
  using (has_area('anmietung') or has_area('jobs'));

create type job_service_status as enum ('angefragt', 'zugesagt', 'abgesagt');

create table job_services (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete restrict,
  status job_service_status not null default 'angefragt',
  on_site_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_job_services_updated_at
  before update on job_services
  for each row execute function set_updated_at();

create index idx_job_services_job on job_services(job_id);
create index idx_job_services_supplier on job_services(supplier_id);

-- ============================================================
-- RLS (Bereich 'jobs', Sichtbarkeit an den Job gekoppelt — Muster job_retrospectives 0048).
-- ============================================================

alter table job_services enable row level security;

create policy job_services_sel on job_services for select using (can_see_job(job_id));
create policy job_services_ins on job_services for insert with check (can_edit_area('jobs'));
create policy job_services_upd on job_services for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy job_services_del on job_services for delete using (can_edit_area('jobs'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select, insert, update, delete on job_services to authenticated;
grant all on job_services to service_role;

notify pgrst, 'reload schema';
