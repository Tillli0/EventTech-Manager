-- EventTech Manager — Profil-Schutz: Server-/Service-Kontext ausnehmen
-- Der Trigger protect_profile_role() schützt Rolle & Sichtmodus vor Änderung durch
-- normale Nutzer. Er feuert aber auch bei serverseitigen Operationen (Migrationen,
-- Edge Function mit Service-Role-Key, Bootstrap) — dort gibt es keinen eingeloggten
-- Nutzer (auth.uid() IS NULL), sodass is_admin()/is_manager() false ist und sonst
-- selbst erlaubte Server-Updates (z.B. Rolle beim Anlegen setzen) scheitern würden.
-- Diese Kontexte sind ohnehin voll vertrauenswürdig (umgehen RLS) → hier ausnehmen.
-- Für echte authentifizierte Nutzer (auth.uid() IS NOT NULL) bleibt der Schutz aktiv.

create or replace function protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-Role / Superuser / Migration: kein eingeloggter Nutzer → durchlassen.
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Nur Administratoren dürfen die Rolle ändern.';
  end if;
  if new.job_view_mode is distinct from old.job_view_mode and not is_manager() then
    raise exception 'Nur Admin/Verwaltung dürfen den Sichtmodus ändern.';
  end if;
  return new;
end;
$$;
