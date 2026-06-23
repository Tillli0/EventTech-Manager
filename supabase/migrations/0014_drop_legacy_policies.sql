-- EventTech Manager — Alt-Policies aus 0002 entfernen
-- 0002 hatte pro Tabelle vier Policies `<tabelle>_<op>_authenticated` mit der Regel
-- `auth.role() = 'authenticated'` (jeder Eingeloggte darf alles). 0006 hat damals nur
-- RLS deaktiviert, die Policies aber NICHT gelöscht. Mit 0012 wurde RLS wieder
-- aktiviert — dadurch wirken die alten Policies wieder und hebeln (weil PERMISSIVE,
-- also OR-verknüpft) die neue bereichsbasierte Rechteprüfung aus.
-- Hier werden die Alt-Policies endgültig entfernt; es bleiben nur die 0012-Policies.

do $$
declare
  t text;
  op text;
  tables text[] := array[
    'categories', 'devices', 'barcodes', 'device_photos', 'device_documents',
    'customers', 'customer_inquiries', 'customer_notes', 'jobs', 'packlist_items',
    'calendar_entries'
  ];
  ops text[] := array['select', 'insert', 'update', 'delete'];
begin
  foreach t in array tables loop
    foreach op in array ops loop
      execute format('drop policy if exists %I on %I;', t || '_' || op || '_authenticated', t);
    end loop;
  end loop;
end $$;
