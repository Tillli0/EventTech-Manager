-- 0052: Team-Verfügbarkeit (PLAN-MEIN-PLAN.md M5, löst ROADMAP P4.1).
--
-- Design-Entscheidungen:
-- * E-G aus PLAN-MEIN-PLAN.md: die Funktion liefert AUSSCHLIESSLICH konkrete
--   Zeiträume (user_id, start_at, end_at) — kein Titel, keine Kategorie, keine
--   Notiz. Das ist die einzige (bewusst schmale) Brücke zwischen den strikt
--   privaten Tabellen personal_blocks/personal_recurring_blocks (RLS
--   user_id = auth.uid(), siehe 0039) und der betrieblichen Job-Planung.
-- * Bewusst EINE Funktion, die wiederkehrende Regeln selbst zu konkreten
--   Zeiträumen auflöst (statt eine zweite Funktion, die Regel-*Formen*
--   zurückgibt) — ein wöchentlicher Block Mo 08:00-15:00 mit Gültigkeit bis
--   Juli ist für sich genommen schon lesbar "Schule". Die Regelmäßigkeit IST
--   die Kategorie; sie über eine zweite Funktion "nur ohne Namen" freizugeben
--   würde E-G im Wortlaut einhalten und im Sinn verletzen.
-- * has_area('jobs') steht INNERHALB des Funktionsrumpfs, nicht nur in der
--   GRANT-Zeile — sonst würde `security definer` die strikte RLS aus 0039
--   für jeden mit einem DB-Zugang unterlaufen (Falle, die die Migration exakt
--   vermeiden soll).
-- * Lokale Uhrzeit -> timestamptz erst hier, in SQL, über
--   `(datum + uhrzeit) at time zone 'Europe/Berlin'` — dieselbe Konstruktion
--   wie lib/personalSchedule.ts auf TS-Seite (dort: lokale JS-Date-Objekte).
--   Postgres übernimmt damit die Sommerzeit-Umstellung korrekt, ohne dass wir
--   sie manuell nachrechnen. Gegenprobe: ein psql- und ein Vitest-Fall über
--   dieselbe Umstellungswoche müssen denselben UTC-Zeitpunkt liefern.
-- * weekday zählt in 0039 ab Montag=0; Postgres' extract(isodow) zählt ab
--   Montag=1 — die Umrechnung (isodow - 1) steht bewusst als eigene Zeile,
--   nicht inline verschachtelt, damit ein Off-by-one beim Lesen auffällt.

create or replace function personal_busy_ranges(range_from timestamptz, range_to timestamptz)
returns table (user_id uuid, start_at timestamptz, end_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.user_id, b.start_at, b.end_at
  from personal_blocks b
  where has_area('jobs')
    and b.start_at < range_to
    and b.end_at > range_from

  union all

  select
    r.user_id,
    (d::date + r.start_time) at time zone 'Europe/Berlin' as start_at,
    (d::date + r.end_time) at time zone 'Europe/Berlin' as end_at
  from personal_recurring_blocks r
  cross join lateral generate_series(
    greatest(r.valid_from, (range_from at time zone 'Europe/Berlin')::date)::timestamp,
    least(coalesce(r.valid_to, (range_to at time zone 'Europe/Berlin')::date), (range_to at time zone 'Europe/Berlin')::date)::timestamp,
    interval '1 day'
  ) as d
  where has_area('jobs')
    and (extract(isodow from d)::int - 1) = r.weekday
    and (d::date + r.start_time) at time zone 'Europe/Berlin' < range_to
    and (d::date + r.end_time) at time zone 'Europe/Berlin' > range_from
$$;

grant execute on function personal_busy_ranges(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
