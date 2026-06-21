-- EventTech Manager — Row Level Security
-- Da es sich um ein internes Team-Tool (2-3 Personen) handelt, gilt das Modell:
-- "Jeder authentifizierte Nutzer hat vollen Zugriff auf alle Daten."
-- Es gibt keine mandantenspezifische Trennung. Anonymer Zugriff ist überall gesperrt.
-- In Phase 2 (users + activity_log) kann dies bei Bedarf auf Rollen verfeinert werden.

-- ============================================================
-- Helper: Policy-Template auf alle Tabellen anwenden
-- ============================================================

do $$
declare
  t text;
  tables text[] := array[
    'categories',
    'devices',
    'barcodes',
    'device_photos',
    'device_documents',
    'customers',
    'customer_inquiries',
    'customer_notes',
    'jobs',
    'packlist_items',
    'calendar_entries'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security;', t);

    execute format(
      'create policy %I on %I for select using (auth.role() = ''authenticated'');',
      t || '_select_authenticated', t
    );
    execute format(
      'create policy %I on %I for insert with check (auth.role() = ''authenticated'');',
      t || '_insert_authenticated', t
    );
    execute format(
      'create policy %I on %I for update using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t || '_update_authenticated', t
    );
    execute format(
      'create policy %I on %I for delete using (auth.role() = ''authenticated'');',
      t || '_delete_authenticated', t
    );
  end loop;
end $$;
