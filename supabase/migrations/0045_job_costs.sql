-- 0045: Kosten am Job (Block B / E6).
--
-- Design-Entscheidungen (siehe PLAN-NEUAUSRICHTUNG.md, Entscheidung F3):
-- * EINE generische Tabelle statt Typ-Aufsplittung — Kostentyp personal/transport/
--   fremdleistung/sonstiges deckt alles ab, was nicht schon aus subrental_items
--   (Anmietkosten) oder Rechnungen (Erlös) kommt.
-- * `hours`/`hourly_rate` sind reiner Komfort fürs Erfassen (Personal-Stundensatz ×
--   Stunden) — die WAHRHEIT ist `amount` (netto). Das Frontend rechnet Stunden×Satz
--   nur vor, gespeichert wird immer der resultierende Betrag.
-- * `profile_id` ist NULLABLE und wird NIRGENDS mit einem gespeicherten Stundensatz
--   verknüpft — Stundensätze an `profiles` zu hängen wäre datenschutzwidrig (für
--   alle mit Bereich 'jobs' lesbar). Der Satz wird bei jeder Kosten-Zeile neu erfasst.
-- * RLS-Bereich bewusst 'anmietung' (nicht 'jobs') — Kosten/Margen sind wie
--   Einkaufspreise bei Anmiet-Vorgängen sensible kaufmännische Daten, sichtbar nur
--   für den Bereich, der auch die Anmiet-Einkaufspreise sieht (Konsistenz zu 0043).

create table job_costs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  cost_type text not null constraint chk_job_costs_cost_type
    check (cost_type in ('personal', 'transport', 'fremdleistung', 'sonstiges')),
  profile_id uuid references profiles(id) on delete set null,
  description text not null constraint chk_job_costs_description check (description <> ''),
  hours numeric(6, 2) constraint chk_job_costs_hours check (hours is null or hours >= 0),
  hourly_rate numeric(8, 2) constraint chk_job_costs_hourly_rate check (hourly_rate is null or hourly_rate >= 0),
  amount numeric(10, 2) not null constraint chk_job_costs_amount check (amount >= 0),
  cost_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_job_costs_updated_at
  before update on job_costs
  for each row execute function set_updated_at();

create index idx_job_costs_job on job_costs(job_id);
create index idx_job_costs_profile on job_costs(profile_id);

-- ============================================================
-- RLS (Bereich 'anmietung' — Kosten/Margen sind sensible kaufmännische Daten,
-- s. Kommentar oben; kein Job-Sichtbezug wie bei subrentals/suppliers).
-- ============================================================

alter table job_costs enable row level security;

create policy job_costs_sel on job_costs for select using (has_area('anmietung'));
create policy job_costs_ins on job_costs for insert with check (can_edit_area('anmietung'));
create policy job_costs_upd on job_costs for update using (can_edit_area('anmietung')) with check (can_edit_area('anmietung'));
create policy job_costs_del on job_costs for delete using (can_edit_area('anmietung'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select, insert, update, delete on job_costs to authenticated;
grant all on job_costs to service_role;

notify pgrst, 'reload schema';
