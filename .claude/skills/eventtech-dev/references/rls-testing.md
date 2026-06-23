# RLS-Policies gegen die laufende DB testen

RLS-Policies verhalten sich oft anders, als der SQL-Text vermuten lässt (z. B. weil
PERMISSIVE-Policies **OR-verknüpft** werden — eine vergessene Alt-Policy kann die ganze
Zugriffslogik aushebeln). Darum: Verhalten **direkt** prüfen, nicht nur den SQL lesen.

## Muster: in einer Transaktion impersonieren und zurückrollen

Alles in **eine** Transaktion mit `rollback` am Ende, damit nichts an den echten Daten
hängen bleibt. Einen Nutzer „werden" über die JWT-Claims, die `auth.uid()` liest:

```sql
\set ON_ERROR_STOP off
begin;

-- Als bestimmter Nutzer agieren:
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"<USER-UUID>","role":"authenticated"}', true);

-- Jetzt z. B. prüfen, was dieser Nutzer sieht:
select count(*) from jobs;        -- nur die für ihn sichtbaren Zeilen
select is_admin(), is_manager();  -- Helper-Funktionen im Nutzerkontext
commit;  -- bzw. rollback;
```

Ausführen:

```bash
docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres < /tmp/rls_test.sql
```

## Stolperfallen (in diesem Repo bereits aufgetreten)

- **`reset role` löscht die JWT-Claims NICHT.** Nach `set_config('request.jwt.claims', …, true)`
  bleibt `auth.uid()` für den Rest der Transaktion gesetzt. Für „Server-Kontext" (Migration/
  Service-Role, `auth.uid()` IS NULL) die Claims explizit leeren:
  `select set_config('request.jwt.claims','', true);`
- **UUIDs in `json_build_object` müssen Strings sein** — als `'…'::text`/gequotet übergeben,
  sonst `trailing junk after numeric literal`.
- **`update x set role='admin'` ist ein No-Op, wenn `role` schon `admin` ist** → Trigger
  feuert nicht (kein `is distinct from`). Für einen echten Negativtest einen tatsächlichen
  Wechsel erzwingen (z. B. `→ 'mitarbeiter'`).
- **Trigger feuern auch für Superuser/Service-Role.** Der Profil-Schutz-Trigger nimmt daher
  den Server-Kontext (`auth.uid() IS NULL`) bewusst aus — sonst scheitern Migrationen und die
  Edge Function. Beim Testen also den Nutzerkontext korrekt setzen.
- **Fehler in einer Transaktion „vergiftet" alle Folgebefehle** (`current transaction is
  aborted …`). Negativtests, die absichtlich eine Exception auslösen, in eine eigene
  Transaktion legen, sonst werden die danach folgenden Tests nicht mehr ausgeführt.

## Existierende Helfer-Funktionen (security definer)

`is_admin()`, `is_manager()`, `has_area(area)`, `can_edit_area(area)`,
`current_job_view_mode()`, `can_see_job(job_id)` — alle lesen `auth.uid()` und umgehen RLS
(keine Rekursion). Im Test nach dem Setzen der Claims direkt aufrufbar.
