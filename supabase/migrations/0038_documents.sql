-- EventTech Manager — Dokumenten-Ablage (Neuausrichtung, Block A / D1)
--
-- Ziel (siehe PLAN-NEUAUSRICHTUNG.md): ein geordneter Ort fuer ALLE Dateien —
-- Genehmigungen vom Amt, Bauplaene, Rechnungen der Verleiher, Vertraege, sowie die
-- automatisch archivierten Angebots-/Rechnungs-PDFs. Statt Datei-Inseln haengt jedes
-- Dokument an seinem Vorgang (Job/Kunde/Angebot/Rechnung/Firma) und ist zusaetzlich
-- ueber eine zentrale Sicht auffindbar.
--
-- Design-Entscheidungen:
--  * PRIVATER Bucket 'documents' (public=false!) — anders als 'device-photos'. Genehmigungen
--    und Eingangsrechnungen duerfen NIE oeffentlich erreichbar sein. Zugriff nur ueber
--    serverseitig signierte URLs, deren Ausstellung die Storage-RLS an die Sichtbarkeit
--    des zugehoerigen documents-Datensatzes koppelt.
--  * POLYMORPHER Bezug (entity_type + entity_id, KEIN Fremdschluessel): ein Dokument kann
--    an sehr verschiedenen Vorgaengen haengen. Die Sichtbarkeit richtet sich nach dem
--    Vorgang und wird in can_see_document()/can_edit_document() auf die bereits
--    bestehenden Rechte-Helfer gemappt.
--  * Bewusst NUR die heute existierenden Vorgangs-Typen (job/customer/offer/invoice/company).
--    'supplier'/'subrental' kommen erst mit Block B (Bereich 'anmietung' existiert im
--    app_area-Enum noch nicht) — dann werden die beiden Helfer + der Check erweitert.
--  * Sensible Verleiher-Eingangsrechnungen (mit Einkaufspreisen) landen spaeter an
--    supplier/subrental und damit unter dem Bereich 'anmietung' — hier schon mitgedacht.

-- ============================================================
-- TABELLE
-- ============================================================

create table documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null constraint chk_documents_entity_type
    check (entity_type in ('job', 'customer', 'offer', 'invoice', 'company')),
  entity_id uuid not null,
  category text not null default 'sonstiges' constraint chk_documents_category
    check (category in ('genehmigung', 'bauplan', 'eingangsrechnung', 'vertrag', 'angebot', 'rechnung', 'sonstiges')),
  title text not null constraint chk_documents_title check (title <> ''),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  notes text,
  -- Kennzeichnet automatisch archivierte Dokumente (erzeugte Angebots-/Rechnungs-PDFs, D4).
  is_auto boolean not null default false,
  uploaded_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

create index idx_documents_entity on documents(entity_type, entity_id);
create index idx_documents_category on documents(category);
create index idx_documents_created_at on documents(created_at);
create index idx_documents_uploaded_by on documents(uploaded_by);

-- ============================================================
-- SICHTBARKEITS-HELFER (security definer → koppeln an bestehende Bereichs-Rechte)
-- ============================================================

-- Wer darf ein Dokument SEHEN? Richtet sich nach dem Vorgang:
--  job      → wie der Job selbst (Bereich 'jobs' ODER als zugewiesener Nutzer)
--  customer → Bereich 'kunden'
--  offer    → Bereich 'angebote'
--  invoice  → Bereich 'angebote'
--  company  → nur Verwaltung/Admin (firmenweite, sensible Unterlagen)
create or replace function can_see_document(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_entity_type
    when 'job'      then can_see_job(p_entity_id)
    when 'customer' then has_area('kunden')
    when 'offer'    then has_area('angebote')
    when 'invoice'  then has_area('angebote')
    when 'company'  then is_manager()
    else false
  end;
$$;

-- Wer darf ein Dokument ANLEGEN/AENDERN/LOESCHEN? Schreibrecht des jeweiligen Bereichs.
create or replace function can_edit_document(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_entity_type
    when 'job'      then can_edit_area('jobs')
    when 'customer' then can_edit_area('kunden')
    when 'offer'    then can_edit_area('angebote')
    when 'invoice'  then can_edit_area('angebote')
    when 'company'  then is_admin()
    else false
  end;
$$;

grant execute on function can_see_document(text, uuid) to authenticated;
grant execute on function can_edit_document(text, uuid) to authenticated;

-- ============================================================
-- RLS auf die Tabelle
-- ============================================================

alter table documents enable row level security;

create policy documents_sel on documents for select
  using (can_see_document(entity_type, entity_id));
create policy documents_ins on documents for insert
  with check (can_edit_document(entity_type, entity_id));
create policy documents_upd on documents for update
  using (can_edit_document(entity_type, entity_id))
  with check (can_edit_document(entity_type, entity_id));
create policy documents_del on documents for delete
  using (can_edit_document(entity_type, entity_id));

-- OHNE GRANTs: still leere Daten/403! Nie anon (0030 haelt anon leer).
grant select, insert, update, delete on documents to authenticated;
grant all on documents to service_role;

-- ============================================================
-- STORAGE: privater Bucket + Policies, die die Sichtbarkeit an documents koppeln
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- SELECT (und damit das Ausstellen signierter URLs) nur, wenn ein sichtbarer
-- documents-Datensatz auf diese Datei zeigt. Das ist der eigentliche Schutz —
-- fremde Dateien lassen sich nicht signieren, selbst wenn man den Pfad kennt.
create policy "documents_obj_sel" on storage.objects for select using (
  bucket_id = 'documents' and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
      and public.can_see_document(d.entity_type, d.entity_id)
  )
);

-- Hochladen: jeder eingeloggte Nutzer darf in den Bucket schreiben. Der eigentlich
-- rechte-relevante Schritt ist das Anlegen der documents-Zeile (documents_ins oben);
-- eine Datei ohne sichtbare Zeile ist fuer niemanden lesbar.
create policy "documents_obj_ins" on storage.objects for insert with check (
  bucket_id = 'documents' and auth.role() = 'authenticated'
);

-- Aendern/Loeschen nur, wenn man den zugehoerigen Vorgang bearbeiten darf.
create policy "documents_obj_upd" on storage.objects for update using (
  bucket_id = 'documents' and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
      and public.can_edit_document(d.entity_type, d.entity_id)
  )
);
create policy "documents_obj_del" on storage.objects for delete using (
  bucket_id = 'documents' and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
      and public.can_edit_document(d.entity_type, d.entity_id)
  )
);

notify pgrst, 'reload schema';
