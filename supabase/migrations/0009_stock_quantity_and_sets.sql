-- EventTech Manager — Stückzahl-Modell + Sets/Pakete
-- Phase 2: Geräte können jetzt eine Stückzahl (stock_quantity) haben statt
-- nur Einzelstück zu sein (z.B. "XLR-Kabel 5m" mit stock_quantity = 20).
-- Verfügbarkeit wird ab jetzt aus der Summe der gebuchten Mengen über aktive,
-- zeitlich überlappende Jobs berechnet statt aus dem binären device_status.
-- Zusätzlich: Sets (feste Zusammenstellungen mehrerer Geräte + Mengen), die
-- beim Hinzufügen zu einem Job als normale Einzelposten "entpackt" werden.

-- ============================================================
-- DEVICES: Stückzahl
-- ============================================================

alter table devices
  add column stock_quantity integer not null default 1
  constraint chk_devices_stock_quantity_positive check (stock_quantity > 0);

comment on column devices.stock_quantity is
  'Gesamtbestand dieses Gerätetyps. 1 = Einzelstück (Standardfall). >1 = Mengen-Gerät, z.B. 20 XLR-Kabel als ein Datensatz mit einem gemeinsamen Barcode.';

-- device_status bleibt für Einzelstücke (stock_quantity = 1) wie bisher relevant
-- (verfuegbar/ausgeliehen/defekt/wartung). Für Mengen-Geräte (stock_quantity > 1)
-- wird Verfügbarkeit stattdessen aus den Packlist-Mengen berechnet (siehe unten);
-- der Status dient dort nur noch für "defekt"/"wartung" als grober Hinweis auf
-- Bestandsprobleme, nicht als binärer Verfügbarkeits-Schalter.

-- ============================================================
-- PACKLIST ITEMS: Teilrückgabe-Felder
-- Bisher: ein Zeitstempel-Paar (picked_up_at/returned_at) pro Posten — passend
-- für Stückzahl 1. Jetzt zusätzlich Stückzahl-Aufteilung für Ausgabe/Rückgabe,
-- damit z.B. "5 ausgegeben, 3 zurück (ok), 2 noch offen" oder "1 von 5 defekt"
-- abgebildet werden kann.
-- ============================================================

alter table packlist_items
  add column quantity_picked_up integer not null default 0
    constraint chk_packlist_qty_picked_up_nonneg check (quantity_picked_up >= 0),
  add column quantity_returned_ok integer not null default 0
    constraint chk_packlist_qty_returned_ok_nonneg check (quantity_returned_ok >= 0),
  add column quantity_damaged integer not null default 0
    constraint chk_packlist_qty_damaged_nonneg check (quantity_damaged >= 0),
  add column quantity_missing integer not null default 0
    constraint chk_packlist_qty_missing_nonneg check (quantity_missing >= 0);

alter table packlist_items
  add constraint chk_packlist_picked_up_le_quantity
    check (quantity_picked_up <= quantity),
  add constraint chk_packlist_returns_le_picked_up
    check (quantity_returned_ok + quantity_damaged + quantity_missing <= quantity_picked_up);

comment on column packlist_items.quantity is
  'Gewünschte/gebuchte Menge für diesen Job (z.B. 5 von 20 verfügbaren Kabeln).';
comment on column packlist_items.quantity_picked_up is
  'Tatsächlich ausgegebene Menge. Kann in mehreren Schritten erfolgen, max. = quantity.';
comment on column packlist_items.quantity_returned_ok is
  'Davon intakt zurückgegeben.';
comment on column packlist_items.quantity_damaged is
  'Davon defekt zurückgegeben (Notiz in damage_notes).';
comment on column packlist_items.quantity_missing is
  'Davon fehlend/nicht zurückgekommen.';

-- picked_up_at/returned_at bleiben als "wann zuletzt eine Ausgabe/Rückgabe-Aktion
-- stattfand" erhalten (für Anzeige "Ausgegeben am ..."), sind aber nicht mehr die
-- alleinige Quelle der Wahrheit für den Status — das ist jetzt die Stückzahl.

-- ============================================================
-- SETS (Pakete) — feste Zusammenstellung mehrerer Gerätetypen + Mengen.
-- Reine "Anlage-Abkürzung": beim Hinzufügen zu einem Job werden die enthaltenen
-- Geräte als normale Einzelposten in die Packliste übernommen (Set-Bezug geht
-- danach bewusst nicht verloren, weil keiner gebraucht wird — siehe Mission).
-- ============================================================

create table device_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_device_sets_updated_at
  before update on device_sets
  for each row execute function set_updated_at();

create table device_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references device_sets(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  quantity integer not null default 1
    constraint chk_set_item_quantity_positive check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (set_id, device_id)
);

create index idx_device_set_items_set on device_set_items(set_id);
create index idx_device_set_items_device on device_set_items(device_id);

-- RLS deaktiviert (konsistent mit dem No-Login-Betrieb, siehe 0006)
alter table device_sets disable row level security;
alter table device_set_items disable row level security;
grant all on device_sets to anon;
grant all on device_sets to authenticated;
grant all on device_set_items to anon;
grant all on device_set_items to authenticated;

-- ============================================================
-- VERFÜGBARKEIT: gebuchte Menge je Gerät über aktive, überlappende Jobs.
-- Ersetzt die bisherige rein binäre Kollisionsprüfung. Ein Gerät ist erst dann
-- ein Konflikt, wenn die Summe der gebuchten Mengen den Lagerbestand übersteigt.
-- ============================================================

create or replace view device_booked_quantities as
select
  pi.device_id,
  pi.job_id,
  pi.quantity,
  j.title as job_title,
  j.start_date,
  j.end_date,
  j.status as job_status
from packlist_items pi
join jobs j on j.id = pi.job_id
where j.status in ('anfrage', 'bestaetigt', 'laeuft');

comment on view device_booked_quantities is
  'Alle gebuchten Mengen pro Gerät über aktive Jobs (Anfrage/Bestätigt/Läuft). Für eine konkrete Verfügbarkeitsprüfung im Anwendungscode nach Zeitraum filtern und Mengen je Gerät summieren; Konflikt liegt vor, wenn Summe > devices.stock_quantity.';
