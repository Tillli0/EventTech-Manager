-- EventTech Manager — Rollen-Eskalation verhindern
-- Die Policy profiles_upd_self erlaubt Nutzern, ihr EIGENES Profil zu ändern (z.B.
-- den Namen). Ohne weiteren Schutz könnten sie dabei aber auch ihre eigene `role`
-- auf 'admin' setzen. Dieser Trigger lässt eine Rollen-Änderung nur durch Admins zu.

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
  return new;
end;
$$;

create trigger trg_protect_profile_role
  before update on profiles
  for each row execute function protect_profile_role();
