-- 0048: Rückblick nach dem Job (Erfahrungsgedächtnis).
--
-- Design-Entscheidungen:
-- * Kleine Notiz statt System: EIN Rückblick je Job (planned_hours/actual_hours/notes),
--   in ~2 Minuten nach dem Event ausgefüllt — kein separates Ist/Soll-Tracking während
--   des Jobs, das würde nie gepflegt. `unique(job_id)` erzwingt das 1:1-Verhältnis.
-- * Alle drei Inhaltsfelder sind einzeln nullable (jemand trägt evtl. nur die Notiz
--   ein, ohne Stunden zu schätzen), aber `chk_job_retrospectives_has_content` verlangt
--   mindestens EIN gefülltes Feld — ein leerer Rückblick wäre sinnlos.
-- * RLS-Bereich 'jobs' + `can_see_job(job_id)` beim Lesen (Muster job_milestones,
--   0012/0016): ein Rückblick ist Job-Wissen, kein separates kaufmännisches Geheimnis
--   wie bei job_costs (0045) — wer den Job sehen darf, darf auch seinen Rückblick sehen.
--   Schreiben bleibt an `can_edit_area('jobs')` gebunden (Muster job_milestones).

create table job_retrospectives (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs(id) on delete cascade,
  planned_hours numeric(6, 2) constraint chk_job_retrospectives_planned_hours check (planned_hours is null or planned_hours >= 0),
  actual_hours numeric(6, 2) constraint chk_job_retrospectives_actual_hours check (actual_hours is null or actual_hours >= 0),
  notes text constraint chk_job_retrospectives_notes check (notes is null or notes <> ''),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_job_retrospectives_has_content check (
    planned_hours is not null or actual_hours is not null or notes is not null
  )
);

create trigger trg_job_retrospectives_updated_at
  before update on job_retrospectives
  for each row execute function set_updated_at();

create index idx_job_retrospectives_created_by on job_retrospectives(created_by);

-- ============================================================
-- RLS (Bereich 'jobs', Sichtbarkeit an den Job gekoppelt — s. Kommentar oben).
-- ============================================================

alter table job_retrospectives enable row level security;

create policy job_retrospectives_sel on job_retrospectives for select using (can_see_job(job_id));
create policy job_retrospectives_ins on job_retrospectives for insert with check (can_edit_area('jobs'));
create policy job_retrospectives_upd on job_retrospectives for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy job_retrospectives_del on job_retrospectives for delete using (can_edit_area('jobs'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select, insert, update, delete on job_retrospectives to authenticated;
grant all on job_retrospectives to service_role;

notify pgrst, 'reload schema';
