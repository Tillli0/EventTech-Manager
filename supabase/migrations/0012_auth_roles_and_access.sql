-- EventTech Manager — Echte Authentifizierung, Rollen & bereichsbasierte Rechte
-- Phase 4: Schluss mit dem No-Login-Betrieb (siehe 0006). Ab jetzt:
--  * Jeder Zugriff erfordert einen eingeloggten Supabase-Auth-Nutzer.
--  * Es gibt Rollen (admin / mitarbeiter) und pro Nutzer + Bereich Lese-/Schreibrechte.
--  * RLS wird wieder aktiviert und über Helfer-Funktionen an diese Rechte gekoppelt.
-- Der Erst-Admin wird NICHT hier per SQL angelegt (fragile auth.users-Inserts), sondern
-- einmalig über die GoTrue-Admin-API gebootstrappt; danach setzt ein kleines UPDATE die
-- Rolle. Siehe README / Bootstrap-Schritt.

-- ============================================================
-- ENUM: Bereiche der App
-- ============================================================

create type app_area as enum ('inventar', 'jobs', 'kunden', 'angebote', 'kalender', 'aufgaben');

-- ============================================================
-- TABELLEN
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'mitarbeiter' constraint chk_profiles_role check (role in ('admin', 'mitarbeiter')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create table user_area_access (
  user_id uuid not null references profiles(id) on delete cascade,
  area app_area not null,
  can_edit boolean not null default false,
  primary key (user_id, area)
);

create index idx_user_area_access_user on user_area_access(user_id);

create table job_assignees (
  job_id uuid not null references jobs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

create index idx_job_assignees_user on job_assignees(user_id);
create index idx_job_assignees_job on job_assignees(job_id);

-- Aufgaben: echte Nutzer-Zuweisung + Ersteller (für „eigene Tasks“)
alter table tasks
  add column created_by uuid references profiles(id) on delete set null default auth.uid(),
  add column assigned_user_id uuid references profiles(id) on delete set null;

create index idx_tasks_assigned_user on tasks(assigned_user_id);
create index idx_tasks_created_by on tasks(created_by);

-- ============================================================
-- AUTO-PROFIL: bei jedem neuen Auth-Nutzer eine profiles-Zeile anlegen
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- HELFER-FUNKTIONEN (security definer → umgehen RLS, keine Rekursion)
-- ============================================================

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function has_area(a app_area)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_admin() or exists (
    select 1 from user_area_access where user_id = auth.uid() and area = a
  );
$$;

create or replace function can_edit_area(a app_area)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_admin() or exists (
    select 1 from user_area_access where user_id = auth.uid() and area = a and can_edit
  );
$$;

grant execute on function is_admin() to authenticated;
grant execute on function has_area(app_area) to authenticated;
grant execute on function can_edit_area(app_area) to authenticated;

-- ============================================================
-- GRANTS auf die neuen Tabellen (RLS regelt die Sichtbarkeit der Zeilen)
-- ============================================================

grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on user_area_access to authenticated;
grant select, insert, update, delete on job_assignees to authenticated;

-- ============================================================
-- RLS AKTIVIEREN
-- ============================================================

-- 1) Einfache Bereiche: volles has_area/can_edit_area-Muster über eine Schleife.
do $$
declare
  rec record;
  mapping jsonb := '[
    {"area":"inventar","tables":["categories","devices","barcodes","device_photos","device_documents","device_sets","device_set_items"]},
    {"area":"kunden","tables":["customers","customer_inquiries","customer_notes"]},
    {"area":"angebote","tables":["offers","offer_items"]},
    {"area":"kalender","tables":["calendar_entries"]}
  ]';
  m jsonb;
  t text;
  a text;
begin
  for m in select * from jsonb_array_elements(mapping) loop
    a := m->>'area';
    for t in select jsonb_array_elements_text(m->'tables') loop
      execute format('alter table %I enable row level security;', t);
      execute format($f$create policy %I on %I for select using (has_area(%L));$f$, t || '_sel', t, a);
      execute format($f$create policy %I on %I for insert with check (can_edit_area(%L));$f$, t || '_ins', t, a);
      execute format($f$create policy %I on %I for update using (can_edit_area(%L)) with check (can_edit_area(%L));$f$, t || '_upd', t, a, a);
      execute format($f$create policy %I on %I for delete using (can_edit_area(%L));$f$, t || '_del', t, a);
    end loop;
  end loop;
end $$;

-- 2) JOBS-Bereich: zugewiesene Nutzer dürfen „ihren“ Job (und dessen Packliste/
--    Meilensteine) sehen, auch ohne vollen Jobs-Bereich. Schreiben bleibt can_edit_area('jobs').
alter table jobs enable row level security;
create policy jobs_sel on jobs for select using (
  has_area('jobs') or exists (select 1 from job_assignees ja where ja.job_id = jobs.id and ja.user_id = auth.uid())
);
create policy jobs_ins on jobs for insert with check (can_edit_area('jobs'));
create policy jobs_upd on jobs for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy jobs_del on jobs for delete using (can_edit_area('jobs'));

alter table packlist_items enable row level security;
create policy packlist_items_sel on packlist_items for select using (
  has_area('jobs') or exists (select 1 from job_assignees ja where ja.job_id = packlist_items.job_id and ja.user_id = auth.uid())
);
create policy packlist_items_ins on packlist_items for insert with check (can_edit_area('jobs'));
create policy packlist_items_upd on packlist_items for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy packlist_items_del on packlist_items for delete using (can_edit_area('jobs'));

alter table job_milestones enable row level security;
create policy job_milestones_sel on job_milestones for select using (
  has_area('jobs') or exists (select 1 from job_assignees ja where ja.job_id = job_milestones.job_id and ja.user_id = auth.uid())
);
create policy job_milestones_ins on job_milestones for insert with check (can_edit_area('jobs'));
create policy job_milestones_upd on job_milestones for update using (can_edit_area('jobs')) with check (can_edit_area('jobs'));
create policy job_milestones_del on job_milestones for delete using (can_edit_area('jobs'));

alter table job_assignees enable row level security;
create policy job_assignees_sel on job_assignees for select using (has_area('jobs') or user_id = auth.uid());
create policy job_assignees_ins on job_assignees for insert with check (can_edit_area('jobs'));
create policy job_assignees_del on job_assignees for delete using (can_edit_area('jobs'));

-- 3) AUFGABEN-Bereich: jeder darf eigene Tasks anlegen/sehen/bearbeiten; der Bereich
--    'aufgaben' gibt vollen Zugriff auf alle Tasks.
alter table tasks enable row level security;
create policy tasks_sel on tasks for select using (
  has_area('aufgaben') or assigned_user_id = auth.uid() or created_by = auth.uid()
);
create policy tasks_ins on tasks for insert with check (
  can_edit_area('aufgaben') or created_by = auth.uid()
);
create policy tasks_upd on tasks for update using (
  can_edit_area('aufgaben') or created_by = auth.uid() or assigned_user_id = auth.uid()
) with check (
  can_edit_area('aufgaben') or created_by = auth.uid() or assigned_user_id = auth.uid()
);
create policy tasks_del on tasks for delete using (
  can_edit_area('aufgaben') or created_by = auth.uid()
);

alter table task_checklist_items enable row level security;
create policy task_checklist_items_sel on task_checklist_items for select using (
  exists (
    select 1 from tasks t where t.id = task_checklist_items.task_id
      and (has_area('aufgaben') or t.assigned_user_id = auth.uid() or t.created_by = auth.uid())
  )
);
create policy task_checklist_items_cud on task_checklist_items for all using (
  exists (
    select 1 from tasks t where t.id = task_checklist_items.task_id
      and (can_edit_area('aufgaben') or t.created_by = auth.uid() or t.assigned_user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from tasks t where t.id = task_checklist_items.task_id
      and (can_edit_area('aufgaben') or t.created_by = auth.uid() or t.assigned_user_id = auth.uid())
  )
);

-- 4) PROFILES & USER_AREA_ACCESS
alter table profiles enable row level security;
-- Alle Eingeloggten dürfen Profile lesen (Namen für Zuweisungs-Dropdowns).
create policy profiles_sel on profiles for select using (auth.role() = 'authenticated');
-- Eigenes Profil (nur Name) ändern; Admin darf alles.
create policy profiles_upd_self on profiles for update using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy profiles_admin_ins on profiles for insert with check (is_admin());
create policy profiles_admin_del on profiles for delete using (is_admin());

alter table user_area_access enable row level security;
create policy uaa_sel on user_area_access for select using (user_id = auth.uid() or is_admin());
create policy uaa_admin_cud on user_area_access for all using (is_admin()) with check (is_admin());

-- ============================================================
-- STORAGE: anon-Policies aus 0006 entfernen (kein No-Login mehr).
-- Die authenticated-Policies aus 0003 greifen weiter für eingeloggte Nutzer.
-- ============================================================

drop policy if exists "device_photos_anon_select" on storage.objects;
drop policy if exists "device_photos_anon_insert" on storage.objects;
drop policy if exists "device_photos_anon_delete" on storage.objects;
drop policy if exists "device_documents_anon_select" on storage.objects;
drop policy if exists "device_documents_anon_insert" on storage.objects;
drop policy if exists "device_documents_anon_delete" on storage.objects;
