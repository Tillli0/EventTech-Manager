-- EventTech Manager — E-Mail im Profil spiegeln
-- auth.users ist vom Client nicht lesbar; für die Nutzerverwaltung (Anzeige/Identifikation)
-- spiegeln wir die E-Mail in profiles. Wird vom handle_new_user-Trigger mitgesetzt.

alter table profiles add column email text;

-- Trigger erweitern: E-Mail des neuen Auth-Nutzers mit übernehmen.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Bestehende Profile (z.B. Bootstrap-Admin) nachziehen.
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;
