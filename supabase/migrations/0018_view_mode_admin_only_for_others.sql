-- EventTech Manager — Sichtmodus: Verwaltung nur für sich selbst
-- Verfeinert 0016/0017: Admin UND Verwaltung dürfen ihren EIGENEN Job-Sichtmodus
-- setzen; den Sichtmodus ANDERER Nutzer darf nur der Admin ändern. Mitarbeiter
-- können ihren Sichtmodus weiterhin gar nicht ändern.

-- Fremde Profile darf nur noch der Admin schreiben (Verwaltung nur das eigene).
-- Bereichsrechte verwaltet die Verwaltung weiterhin über user_area_access (eigene Policy).
drop policy profiles_upd on profiles;
create policy profiles_upd on profiles for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

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

  -- Rolle: nur Admin.
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Nur Administratoren dürfen die Rolle ändern.';
  end if;

  -- Sichtmodus: eigenes Profil → Admin oder Verwaltung; fremdes Profil → nur Admin.
  if new.job_view_mode is distinct from old.job_view_mode then
    if new.id = auth.uid() then
      if not is_manager() then
        raise exception 'Nur Admin/Verwaltung dürfen ihren Sichtmodus ändern.';
      end if;
    else
      if not is_admin() then
        raise exception 'Nur Administratoren dürfen den Sichtmodus anderer Nutzer ändern.';
      end if;
    end if;
  end if;

  return new;
end;
$$;
