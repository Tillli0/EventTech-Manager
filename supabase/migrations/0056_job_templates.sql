-- 0056: Vorlagen je Event-Art (PLAN-EVENT-PLANUNG.md P3).
--
-- Scope-Entscheidung (v1, schriftlich vor dem Bauen festgelegt, wie der Plan es
-- verlangt): eine Vorlage deckt in v1 NUR Programmpunkte ab (job_milestones),
-- nicht Aufgaben/Material/Crew-Rollen/Gewerke. Begründung: das ist der einzige
-- Item-Typ, dessen Übertragung ohne Fremdschlüssel-Auflösung auskommt (reiner
-- Zeit-Offset + Text). Material bräuchte eine Geräte-/Kategorie-Zuordnung,
-- Crew-Rollen eine Personen-Zuordnung, Gewerke eine Partner-Zuordnung — jedes
-- davon ist ein eigenes Feature mit eigenen Fehlerfällen (was, wenn die Vorlage
-- auf einen Gerätetyp verweist, der nicht mehr existiert?). v1 liefert echten
-- Wert (Zeitplan wiederverwenden) ohne diese Ausweitung; weitere Item-Arten sind
-- eine bewusst offene Erweiterung, kein technisches Schulden-Signal.
--
-- Zeiten als Offset in Minuten zum Job-Start (E-C) — nie absolut, sonst würde
-- jede Vorlage nur für ein einziges Datum passen. Kein Bezug zu einem
-- bestimmten Job: eine Vorlage ist Betriebswissen wie `venues`/`suppliers`
-- (Bereich 'jobs', has_area/can_edit_area — Muster subrentals/subrental_items
-- aus 0042, direkte Area-Prüfung statt Join über den Elterndatensatz).

create table job_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint chk_job_templates_name check (name <> ''),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_job_templates_updated_at
  before update on job_templates
  for each row execute function set_updated_at();

create table job_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references job_templates(id) on delete cascade,
  title text not null constraint chk_job_template_items_title check (title <> ''),
  -- Minuten relativ zu jobs.start_date; kann negativ sein (z.B. Vorbereitung
  -- vor dem offiziellen Start) oder über die Job-Dauer hinausgehen (Abbau).
  offset_minutes integer not null,
  duration_minutes integer constraint chk_job_template_items_duration check (duration_minutes is null or duration_minutes >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_job_template_items_template on job_template_items(template_id);

-- ============================================================
-- RLS (Bereich 'jobs' — Betriebswissen, kein Job-Sichtbezug, Muster subrentals).
-- ============================================================

alter table job_templates enable row level security;
alter table job_template_items enable row level security;

create policy job_templates_sel on job_templates for select using (has_area('jobs'));
create policy job_templates_ins on job_templates for insert with check (can_edit_area('jobs'));
create policy job_templates_upd on job_templates for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy job_templates_del on job_templates for delete using (can_edit_area('jobs'));

create policy job_template_items_sel on job_template_items for select using (has_area('jobs'));
create policy job_template_items_ins on job_template_items for insert with check (can_edit_area('jobs'));
create policy job_template_items_upd on job_template_items for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy job_template_items_del on job_template_items for delete using (can_edit_area('jobs'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030).
grant select, insert, update, delete on job_templates to authenticated;
grant select, insert, update, delete on job_template_items to authenticated;
grant all on job_templates to service_role;
grant all on job_template_items to service_role;

notify pgrst, 'reload schema';
