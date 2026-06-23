-- Kalender-Abo (einseitige Synchronisation nach Google / Apple Kalender)
--
-- Jeder Nutzer bekommt einen geheimen Token, über den ein .ics-Feed (Edge
-- Function `calendar-feed`) abrufbar ist. Der Feed spiegelt unseren internen
-- Kalender (Termine + Job-Zeitplan) read-only in den privaten Kalender.
-- Der Token ist das Geheimnis (wie bei Googles "geheimer iCal-Adresse"):
-- wer ihn hat, darf den Feed lesen. Darum strikt nur für den Eigentümer
-- sichtbar — NICHT über das offene profiles-select-Policy auslesbar.

create table if not exists calendar_feeds (
  user_id uuid primary key references profiles(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

alter table calendar_feeds enable row level security;

create policy calendar_feeds_select on calendar_feeds
  for select using (user_id = auth.uid());
create policy calendar_feeds_insert on calendar_feeds
  for insert with check (user_id = auth.uid());
create policy calendar_feeds_update on calendar_feeds
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy calendar_feeds_delete on calendar_feeds
  for delete using (user_id = auth.uid());

-- Token des aktuellen Nutzers holen (legt bei Bedarf einen an).
create or replace function get_or_create_calendar_feed()
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert.';
  end if;
  insert into calendar_feeds (user_id) values (auth.uid())
    on conflict (user_id) do nothing;
  select token into t from calendar_feeds where user_id = auth.uid();
  return t;
end; $$;

-- Token neu würfeln (macht alte Abo-Links ungültig).
create or replace function regenerate_calendar_feed()
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert.';
  end if;
  insert into calendar_feeds (user_id, token) values (auth.uid(), t)
    on conflict (user_id) do update set token = excluded.token;
  return t;
end; $$;

grant execute on function get_or_create_calendar_feed() to authenticated;
grant execute on function regenerate_calendar_feed() to authenticated;

-- Neue Tabellen werden in dieser Supabase-Version nicht automatisch über die
-- Data-API exponiert. Damit die Edge Function (service_role) den Token auflösen
-- und die App (authenticated, via RLS) zugreifen kann, brauchen wir GRANTs.
-- RLS schützt authenticated weiterhin auf Zeilenebene (nur eigene Zeile).
grant select, insert, update, delete on calendar_feeds to service_role, authenticated;

-- Die Edge Function liest als service_role den Kalender zusammen. In diesem
-- Projekt sind Tabellen nicht automatisch für die Data-API-Rollen freigegeben,
-- darum SELECT explizit erteilen (read-only, nur was der Feed braucht).
grant select on calendar_entries, job_milestones, jobs to service_role;
