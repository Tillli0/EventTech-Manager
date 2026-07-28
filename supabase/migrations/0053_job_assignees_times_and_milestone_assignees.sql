-- 0053: Crew mit Zeiten und Rollen (PLAN-EVENT-PLANUNG.md P4/E1).
--
-- Design-Entscheidungen:
-- * job_assignees bekommt start_at/end_at/role (alle nullable, non-destruktiv) —
--   EINE Zeile je Person je Job (der bestehende Verbund-Schlüssel job_id+user_id
--   bleibt). Zwei getrennte Schichten derselben Person am selben Job sind damit
--   bewusst nicht abbildbar — für ein Drei-Mann-Team reicht "Zeiten/Rolle
--   beschreiben den ganzen Einsatz". Die Alternative (eigene id-Spalte, mehrere
--   Zeilen je Person) würde jeden bestehenden `assignees:job_assignees(user_id)`-
--   Join anfassen (useJobs.ts, useCalendar.ts) — unverhältnismäßig für dieses Team.
-- * role ist bewusst TEXT, kein Enum — Rollen sind frei (Ton/Licht/Bühne/Fahrer/…),
--   und ein Enum bräuchte bei jeder neuen Rolle eine eigene Migration (0040-Falle).
-- * NEUE update-Policy nötig: 0012 kennt für job_assignees nur _sel/_ins/_del.
--   Bewusst weiterhin nur can_edit_area('jobs') — NICHT auf user_id = auth.uid()
--   erweitert, sonst könnte ein Crew-Mitglied die eigene Kostenbasis (E2) hochsetzen.
-- * milestone_assignees ("wer macht was", vormals in PLAN-MEIN-PLAN.md §6 als
--   "ferne Zukunft" geparkt, von Till am 28.07.2026 freigegeben): Verbund-Schlüssel
--   wie job_assignees, keine eigenen Spalten außer der Zuordnung selbst.

alter table job_assignees add column start_at timestamptz;
alter table job_assignees add column end_at timestamptz;
alter table job_assignees add column role text;
alter table job_assignees add column updated_at timestamptz not null default now();

alter table job_assignees add constraint chk_job_assignees_range
  check (start_at is null or end_at is null or end_at >= start_at);

create trigger trg_job_assignees_updated_at
  before update on job_assignees
  for each row execute function set_updated_at();

create policy job_assignees_upd on job_assignees
  for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));

create table milestone_assignees (
  milestone_id uuid not null references job_milestones(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (milestone_id, user_id)
);

create index idx_milestone_assignees_user on milestone_assignees(user_id);

alter table milestone_assignees enable row level security;

create policy milestone_assignees_sel on milestone_assignees for select using (
  exists (select 1 from job_milestones m where m.id = milestone_id and can_see_job(m.job_id))
);
create policy milestone_assignees_ins on milestone_assignees for insert with check (can_edit_area('jobs'));
create policy milestone_assignees_del on milestone_assignees for delete using (can_edit_area('jobs'));

grant select, insert, delete on milestone_assignees to authenticated;
grant all on milestone_assignees to service_role;

notify pgrst, 'reload schema';
