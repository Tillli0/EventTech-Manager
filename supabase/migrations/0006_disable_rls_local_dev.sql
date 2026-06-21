-- EventTech Manager — RLS deaktivieren für lokale Entwicklung (kein Login)
-- Migration 0002 hat RLS mit "authenticated"-Policies auf allen Phase-1-Tabellen aktiviert.
-- Das Projekt läuft lokal aber bewusst ohne Login (anon-Key), siehe README/Setup-Notizen.
-- Bisher wurde das nach jedem `supabase db reset` manuell per docker exec/psql nachgezogen
-- (RLS deaktivieren + GRANT ALL). Das wird hiermit dauerhaft in einer Migration festgehalten,
-- damit `supabase db reset` direkt ein funktionierendes Setup ergibt.
--
-- Sobald es ein echtes Login/Auth gibt (siehe "Offene Lücken"), sollte diese Migration
-- durch echte RLS-Policies ersetzt werden.
--
-- Hinweis: 'tasks' (0004) und 'job_milestones' (0005) sind hier bewusst nicht aufgeführt,
-- da sie ihr RLS-Disable/Grant bereits in ihrer eigenen Migration mitbringen.

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
    execute format('alter table %I disable row level security;', t);
    execute format('grant all on %I to anon;', t);
    execute format('grant all on %I to authenticated;', t);
  end loop;
end $$;

-- Sequenzen (falls vorhanden) ebenfalls freigeben, sonst schlagen IDENTITY/SERIAL-Inserts fehl.
grant usage, select on all sequences in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;

-- Storage-Policies aus 0003 verlangen ebenfalls auth.role() = 'authenticated'.
-- Für den lokalen No-Login-Betrieb zusätzlich anon-Policies anlegen (additiv, ersetzt nichts).
create policy "device_photos_anon_select"
  on storage.objects for select
  using (bucket_id = 'device-photos' and auth.role() = 'anon');

create policy "device_photos_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'device-photos' and auth.role() = 'anon');

create policy "device_photos_anon_delete"
  on storage.objects for delete
  using (bucket_id = 'device-photos' and auth.role() = 'anon');

create policy "device_documents_anon_select"
  on storage.objects for select
  using (bucket_id = 'device-documents' and auth.role() = 'anon');

create policy "device_documents_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'device-documents' and auth.role() = 'anon');

create policy "device_documents_anon_delete"
  on storage.objects for delete
  using (bucket_id = 'device-documents' and auth.role() = 'anon');

