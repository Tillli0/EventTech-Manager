-- EventTech Manager — Job-Farben + Unterevents (Meilensteine)
-- Phase 2: Jobs bekommen eine Farbe für die Kalenderdarstellung,
-- zusätzlich optionale Unterevents (z.B. Aufbau, Abbau, Eventstart),
-- die im Kalender unterhalb des Job-Balkens als Punkt angezeigt werden.

alter table jobs add column color text not null default '#6366f1';

create table job_milestones (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  title text not null,
  at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_job_milestones_job on job_milestones(job_id);
create index idx_job_milestones_at on job_milestones(at);

-- RLS deaktiviert (konsistent mit Phase 1 für lokale Entwicklung)
alter table job_milestones disable row level security;
grant all on job_milestones to anon;
grant all on job_milestones to authenticated;
