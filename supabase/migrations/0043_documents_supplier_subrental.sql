-- 0043: `documents` um entity_type 'supplier'/'subrental' erweitern (Block B / E2b).
--
-- In 0038 (Block A, D1) bereits als Folge-Schritt angekündigt: „'supplier'/'subrental'
-- kommen erst mit Block B (Bereich 'anmietung' existiert im app_area-Enum noch nicht)
-- — dann werden die beiden Helfer + der Check erweitert." Der Bereich existiert seit
-- Migration 0040, `subrentals`/`suppliers` seit 0041/0042 — jetzt folgt die Erweiterung.
--
-- Anlass: E2b (KI-Dokumenten-Extraktion) archiviert das hochgeladene Verleiher-PDF
-- (Angebot/Rechnung) am Anmiet-Vorgang. Sensible Einkaufspreise sind damit — wie in
-- 0038 vorgesehen — ausschließlich für den Bereich 'anmietung' sichtbar.
--
-- Kein ENUM-Trap hier: `entity_type` ist eine text-Spalte mit CHECK-Constraint, kein
-- Postgres-ENUM-Typ — Constraint ersetzen + Funktionen ändern in einer Transaktion ist
-- unproblematisch.

alter table documents drop constraint chk_documents_entity_type;
alter table documents add constraint chk_documents_entity_type
  check (entity_type in ('job', 'customer', 'offer', 'invoice', 'company', 'supplier', 'subrental'));

create or replace function can_see_document(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_entity_type
    when 'job'       then can_see_job(p_entity_id)
    when 'customer'  then has_area('kunden')
    when 'offer'     then has_area('angebote')
    when 'invoice'   then has_area('angebote')
    when 'company'   then is_manager()
    when 'supplier'  then has_area('anmietung')
    when 'subrental' then has_area('anmietung')
    else false
  end;
$$;

create or replace function can_edit_document(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_entity_type
    when 'job'       then can_edit_area('jobs')
    when 'customer'  then can_edit_area('kunden')
    when 'offer'     then can_edit_area('angebote')
    when 'invoice'   then can_edit_area('angebote')
    when 'company'   then is_admin()
    when 'supplier'  then can_edit_area('anmietung')
    when 'subrental' then can_edit_area('anmietung')
    else false
  end;
$$;

notify pgrst, 'reload schema';
