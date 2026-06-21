-- EventTech Manager — Tasks / Aufgaben
-- Phase 2: Aufgaben mit Zuweisung, Priorität, Status, Job-Verknüpfung

create type task_status as enum (
  'offen',
  'in_bearbeitung',
  'erledigt'
);

-- task_priority existiert bereits aus Phase 1 Schema (niedrig, normal, hoch, dringend)
-- Wir nutzen sie direkt

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status task_status not null default 'offen',
  priority task_priority not null default 'normal',
  assigned_to text,
  due_date date,
  job_id uuid references jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create index idx_tasks_status on tasks(status);
create index idx_tasks_job on tasks(job_id);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_assigned on tasks(assigned_to);

-- RLS deaktiviert (konsistent mit Phase 1 für lokale Entwicklung)
alter table tasks disable row level security;
grant all on tasks to anon;
grant all on tasks to authenticated;
