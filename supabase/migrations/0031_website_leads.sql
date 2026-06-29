-- 0031: Website-Kontaktformular -> System.
--
-- Einsendungen des öffentlichen Kontaktformulars der Firmen-Website (Lovable)
-- landen als Rohdaten in einer eigenen Tabelle `website_leads` zur manuellen
-- Sichtung. Bewusst NICHT direkt `customer_inquiries`, denn das braucht einen
-- Pflicht-`customer_id` (würde Kunden-Dubletten/Zwang erzeugen). Aus einem Lead
-- macht ein Innen-Nutzer später per Klick einen echten Kunden.
--
-- Geschrieben wird ausschließlich serverseitig über die Edge Function
-- `public-lead` (Service-Role, RLS-Bypass) — es gibt KEIN INSERT-Recht für
-- `anon`/`authenticated`. Lesen/Bearbeiten/Löschen nur für berechtigte
-- Innen-Nutzer des Bereichs 'kunden' (Muster aus 0012).

create table website_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  event_date date,
  event_type text,
  message text,
  status text not null default 'neu'
    constraint chk_website_leads_status check (status in ('neu', 'bearbeitet', 'verworfen')),
  created_at timestamptz not null default now()
);

create index idx_website_leads_status on website_leads(status);
create index idx_website_leads_created_at on website_leads(created_at desc);

-- ============================================================
-- GRANTS: kein anon (Härtung 0030). authenticated darf lesen/ändern/löschen,
-- service_role zusätzlich einfügen (die Edge Function schreibt darüber).
-- ============================================================

grant select, update, delete on website_leads to authenticated;
grant select, insert, update, delete on website_leads to service_role;

-- ============================================================
-- RLS: Sichtung/Bearbeitung an den Bereich 'kunden' gekoppelt.
-- KEIN INSERT-Policy -> niemand kann über die Data-API einfügen; nur die
-- Edge Function (Service-Role) umgeht RLS und schreibt.
-- ============================================================

alter table website_leads enable row level security;

create policy website_leads_sel on website_leads
  for select using (has_area('kunden'));
create policy website_leads_upd on website_leads
  for update using (can_edit_area('kunden')) with check (can_edit_area('kunden'));
create policy website_leads_del on website_leads
  for delete using (can_edit_area('kunden'));

notify pgrst, 'reload schema';
