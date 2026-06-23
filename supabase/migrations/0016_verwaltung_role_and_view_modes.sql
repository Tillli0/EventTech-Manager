-- EventTech Manager — Verwaltungs-Rolle & Job-Sichtmodi
-- Erweitert das Rollen-/Rechtemodell aus 0012:
--  * Neue Rolle 'verwaltung': darf Bereichsrechte, Job-Zuweisungen und Sichtmodi
--    (auch für andere) verwalten und sieht/bearbeitet alle Bereiche — aber legt
--    KEINE Accounts an/löscht sie nicht und vergibt keine Rollen (bleibt Admin).
--  * Sichtmodus pro Nutzer für Jobs ('eigene' / 'zugewiesene' / 'alle'), per RLS
--    erzwungen. Admin/Verwaltung dürfen den eigenen Modus und den anderer setzen;
--    Mitarbeiter können ihren Modus nicht ändern.

-- ============================================================
-- 1) ROLLE 'verwaltung' erlauben + Sichtmodus-Spalte
-- ============================================================

alter table profiles drop constraint chk_profiles_role;
alter table profiles add constraint chk_profiles_role
  check (role in ('admin', 'verwaltung', 'mitarbeiter'));

alter table profiles add column job_view_mode text not null default 'zugewiesene'
  constraint chk_job_view_mode check (job_view_mode in ('eigene', 'zugewiesene', 'alle'));

-- Ersteller eines Jobs (für den Sichtmodus 'eigene'). Bestandsjobs bleiben NULL.
alter table jobs add column created_by uuid references profiles(id) on delete set null default auth.uid();

-- ============================================================
-- 2) HELFER-FUNKTIONEN
-- ============================================================

-- Admin ODER Verwaltung = "Manager" (volle Bereichsrechte + Verwaltungsfunktionen).
create or replace function is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'verwaltung'));
$$;

-- has_area / can_edit_area: Manager (Admin+Verwaltung) haben überall Zugriff.
create or replace function has_area(a app_area)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_manager() or exists (
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
  select is_manager() or exists (
    select 1 from user_area_access where user_id = auth.uid() and area = a and can_edit
  );
$$;

-- Aktueller Sichtmodus des angemeldeten Nutzers (Default 'zugewiesene').
create or replace function current_job_view_mode()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select job_view_mode from profiles where id = auth.uid()), 'zugewiesene');
$$;

-- Darf der aktuelle Nutzer diesen Job sehen? Vereint Zuweisung, Bereichsrecht und
-- Sichtmodus an EINER Stelle, damit Job + Packliste + Meilensteine konsistent sind.
--  * Zugewiesene Jobs sind immer sichtbar (Grundregel).
--  * Mit Jobs-Bereich zusätzlich je nach Sichtmodus:
--      'alle'        → alle Jobs
--      'eigene'      → selbst angelegte Jobs
--      'zugewiesene' → (bereits durch die Grundregel abgedeckt)
create or replace function can_see_job(jid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from job_assignees ja where ja.job_id = jid and ja.user_id = auth.uid())
    or (
      has_area('jobs') and (
        current_job_view_mode() = 'alle'
        or (current_job_view_mode() = 'eigene'
            and exists (select 1 from jobs j where j.id = jid and j.created_by = auth.uid()))
      )
    );
$$;

grant execute on function is_manager() to authenticated;
grant execute on function current_job_view_mode() to authenticated;
grant execute on function can_see_job(uuid) to authenticated;

-- ============================================================
-- 3) JOB-SICHTBARKEIT auf den Sichtmodus umstellen
-- ============================================================

drop policy jobs_sel on jobs;
create policy jobs_sel on jobs for select using (can_see_job(id));

drop policy packlist_items_sel on packlist_items;
create policy packlist_items_sel on packlist_items for select using (can_see_job(job_id));

drop policy job_milestones_sel on job_milestones;
create policy job_milestones_sel on job_milestones for select using (can_see_job(job_id));

drop policy job_assignees_sel on job_assignees;
create policy job_assignees_sel on job_assignees for select using (can_see_job(job_id) or user_id = auth.uid());

-- ============================================================
-- 4) VERWALTUNG: Bereichsrechte & Sichtmodus für andere setzen
-- ============================================================

-- user_area_access: Manager (statt nur Admin) dürfen lesen und schreiben.
drop policy uaa_sel on user_area_access;
create policy uaa_sel on user_area_access for select using (user_id = auth.uid() or is_manager());
drop policy uaa_admin_cud on user_area_access;
create policy uaa_cud on user_area_access for all using (is_manager()) with check (is_manager());

-- profiles: Manager dürfen fremde Profile aktualisieren (für Sichtmodus). Rollen-
-- und Sichtmodus-Schutz übernimmt der Trigger unten.
drop policy profiles_upd_self on profiles;
create policy profiles_upd on profiles for update
  using (id = auth.uid() or is_manager())
  with check (id = auth.uid() or is_manager());

-- Schutz: Rolle nur Admin; Sichtmodus nur Manager (Mitarbeiter können den eigenen
-- Sichtmodus nicht ändern, obwohl sie ihr Profil sonst bearbeiten dürfen).
create or replace function protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Nur Administratoren dürfen die Rolle ändern.';
  end if;
  if new.job_view_mode is distinct from old.job_view_mode and not is_manager() then
    raise exception 'Nur Admin/Verwaltung dürfen den Sichtmodus ändern.';
  end if;
  return new;
end;
$$;
