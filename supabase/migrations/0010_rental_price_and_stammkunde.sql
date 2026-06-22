-- EventTech Manager — Tagesmietpreis an Geräten + Stammkunden-Kennzeichnung
-- Phase 3:
--  * devices.daily_rental_price: Netto-Tagesmietpreis, Vorbelegung für Angebotspositionen.
--  * customers.is_stammkunde: 3-Wege-Override für die Stammkunden-Markierung.
--  * View customer_job_counts: Anzahl nicht-stornierter Jobs je Kunde (für die
--    automatische Stammkunden-Erkennung ab 2 Jobs).

-- ============================================================
-- DEVICES: Tagesmietpreis
-- ============================================================

alter table devices
  add column daily_rental_price numeric
  constraint chk_devices_daily_rental_price_nonneg
    check (daily_rental_price is null or daily_rental_price >= 0);

comment on column devices.daily_rental_price is
  'Netto-Tagesmietpreis in EUR. Wird als Vorbelegung für Angebotspositionen genutzt.';

-- ============================================================
-- CUSTOMERS: Stammkunden-Override
-- NULL  = automatisch (ab 2 nicht-stornierten Jobs gilt der Kunde als Stammkunde)
-- true  = immer als Stammkunde markieren
-- false = nie als Stammkunde markieren
-- ============================================================

alter table customers
  add column is_stammkunde boolean;

comment on column customers.is_stammkunde is
  'Stammkunden-Override: NULL = automatisch (>=2 Jobs), true = immer, false = nie.';

-- ============================================================
-- VIEW: nicht-stornierte Jobs je Kunde (Basis der Auto-Erkennung)
-- ============================================================

create or replace view customer_job_counts as
select
  customer_id,
  count(*)::int as job_count
from jobs
where status <> 'storniert'
  and customer_id is not null
group by customer_id;

comment on view customer_job_counts is
  'Anzahl nicht-stornierter Jobs je Kunde. Ab 2 gilt ein Kunde automatisch als Stammkunde (sofern kein manueller Override gesetzt ist).';

grant select on customer_job_counts to anon;
grant select on customer_job_counts to authenticated;
