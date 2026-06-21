-- EventTech Manager — Aufgaben: Checklisten-Items + Typ-Feld
-- Jede Aufgabe kann entweder "Notizen" oder "Liste" sein.

alter table tasks add column if not exists content_type text not null default 'notes'
  check (content_type in ('notes', 'list'));

create table if not exists task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  text text not null default '',
  checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_checklist_task on task_checklist_items(task_id);

alter table task_checklist_items disable row level security;
grant all on task_checklist_items to anon;
grant all on task_checklist_items to authenticated;
