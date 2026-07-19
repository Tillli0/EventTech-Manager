-- EventTech Manager — Persönliche Zeitachse, Fundament (M1 aus PLAN-MEIN-PLAN.md,
-- vorgezogen für PLAN-UI-NEUSCHNITT.md U4: Kalender-Ebenen).
--
-- Zwei schlanke Tabellen statt einer generischen RRULE-Maschine (Entscheidung E-D):
--  * personal_blocks — konkrete Zeiträume (Köln-Schicht, Klausur, Ferien, Urlaub, krank).
--  * personal_recurring_blocks — wöchentliche Regel (Wochentag + Uhrzeit + Gültigkeit),
--    für Stundenplan und feste Schichtmuster. Die Auflösung "Regel → Termine" passiert
--    als reine Funktion im Frontend (lib/personalSchedule.ts), NICHT in der DB.
--
-- ⚠️ RLS-Sonderfall, bewusst (Entscheidung E-A): Anders als jede andere Tabelle in
-- diesem Projekt hängt der Zugriff NICHT an has_area()/is_manager(). Er ist strikt
-- `user_id = auth.uid()` — AUCH Admin und Verwaltung sehen fremde persönliche Daten
-- NICHT. Klausurzeiten, Krankheit und Schichten sind keine Betriebsdaten. Eine spätere
-- Session könnte versucht sein, das an das Standardmuster "anzugleichen" — das würde
-- genau die Trennung aufheben, die dieses Fundament herstellen soll. NICHT ändern, ohne
-- diesen Kommentar UND PLAN-MEIN-PLAN.md §3 E-A gelesen zu haben.
--
-- personal_settings (Geburtsdatum, Stundensatz, Jugendarbeitsschutz-Grenzwerte) folgt
-- erst mit M3/M4 — hier noch nicht gebraucht, deshalb bewusst nicht mitgebaut.

create type personal_block_category as enum (
  'koeln_schicht', 'schule', 'klausur', 'ferien', 'urlaub', 'krank', 'sonstiges'
);

-- ============================================================
-- TABELLEN
-- ============================================================

create table personal_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category personal_block_category not null,
  title text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_personal_blocks_range check (end_at >= start_at)
);

create index idx_personal_blocks_user on personal_blocks(user_id);
create index idx_personal_blocks_range on personal_blocks(start_at, end_at);

create trigger trg_personal_blocks_updated_at
  before update on personal_blocks
  for each row execute function set_updated_at();

create table personal_recurring_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category personal_block_category not null,
  title text,
  weekday smallint not null constraint chk_prb_weekday check (weekday between 0 and 6), -- 0 = Montag
  start_time time not null,
  end_time time not null,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_prb_time_range check (end_time > start_time),
  constraint chk_prb_valid_range check (valid_to is null or valid_to >= valid_from)
);

create index idx_prb_user on personal_recurring_blocks(user_id);

create trigger trg_prb_updated_at
  before update on personal_recurring_blocks
  for each row execute function set_updated_at();

-- ============================================================
-- RLS — strikt user_id = auth.uid(), siehe Kopfkommentar (E-A)
-- ============================================================

alter table personal_blocks enable row level security;

create policy personal_blocks_sel on personal_blocks for select using (user_id = auth.uid());
create policy personal_blocks_ins on personal_blocks for insert with check (user_id = auth.uid());
create policy personal_blocks_upd on personal_blocks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy personal_blocks_del on personal_blocks for delete using (user_id = auth.uid());

alter table personal_recurring_blocks enable row level security;

create policy prb_sel on personal_recurring_blocks for select using (user_id = auth.uid());
create policy prb_ins on personal_recurring_blocks for insert with check (user_id = auth.uid());
create policy prb_upd on personal_recurring_blocks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy prb_del on personal_recurring_blocks for delete using (user_id = auth.uid());

-- ============================================================
-- GRANTs — explizit, sonst still leere Daten/403 (CLAUDE.md-Stolperstein).
-- anon bekommt bewusst nichts (Migration 0030 revoked das ohnehin als Default).
-- ============================================================

grant select, insert, update, delete on personal_blocks to authenticated;
grant select, insert, update, delete on personal_recurring_blocks to authenticated;
grant all on personal_blocks to service_role;
grant all on personal_recurring_blocks to service_role;

notify pgrst, 'reload schema';
