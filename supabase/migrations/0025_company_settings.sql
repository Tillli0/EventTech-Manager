-- 0025: Firmendaten für die Angebots-PDFs (Briefkopf/Fußzeile) in der DB,
-- admin-bearbeitbar. Löst die fest verdrahteten Platzhalter aus
-- apps/web/src/lib/companyInfo.ts ab. Genau eine Zeile (id = true erzwungen).

create table if not exists company_settings (
  id boolean primary key default true check (id),
  name text not null default '',
  address_lines text[] not null default '{}',
  phone text,
  email text,
  website text,
  tax_id text,
  bank_line text,
  payment_terms text,
  updated_at timestamptz not null default now()
);

alter table company_settings enable row level security;
-- Lesen: jeder Eingeloggte (die PDF-Erzeugung braucht die Daten).
-- Anlegen/Ändern: nur Admin.
create policy company_settings_sel on company_settings for select using (auth.role() = 'authenticated');
create policy company_settings_ins on company_settings for insert with check (is_admin());
create policy company_settings_upd on company_settings for update using (is_admin()) with check (is_admin());

grant select, insert, update on company_settings to authenticated;
grant select, insert, update on company_settings to service_role;

-- Seed mit den bisherigen Platzhalter-Werten, damit das PDF sofort weiter funktioniert.
insert into company_settings (id, name, address_lines, phone, email, website, tax_id, bank_line, payment_terms)
values (
  true,
  'EventTech GmbH',
  array['Musterstraße 1', '12345 Musterstadt'],
  '+49 123 456789',
  'info@eventtech.example',
  'www.eventtech.example',
  'DE000000000',
  'Musterbank · IBAN DE00 0000 0000 0000 0000 00 · BIC XXXXDEXX',
  'Dieses Angebot ist freibleibend. Alle Preise verstehen sich netto zzgl. der gesetzlichen Umsatzsteuer.'
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
