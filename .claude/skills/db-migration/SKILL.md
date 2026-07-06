---
name: db-migration
description: >-
  Rezept für JEDE Schema-Änderung im EventTech-Manager (neue Tabelle, Spalte, Funktion,
  Trigger, RLS-Policy). Nutze diesen Skill IMMER, bevor du eine Datei in
  supabase/migrations/ anlegst oder änderst — er enthält die Pflicht-Schablone
  (RLS + GRANTs), die Nummernvergabe, das lokale Anwenden, Nebenläufigkeits-Tests
  (Advisory Locks) und den Weg in die Cloud. Auch auslösen bei Symptomen wie „Tabelle
  liefert still leere Daten", 403 trotz Login, oder wenn eine DB-Funktion/Nummernkreis
  parallel-sicher sein muss.
---

# DB-Migration — sicher entwerfen, anwenden, ausliefern

## Eiserne Regeln

1. **Non-destruktiv:** nie `drop`/`alter` mit Datenverlust auf bestehenden Tabellen.
   Umbenennen/Ersetzen = neue Struktur + Übergangslogik.
2. **Fortlaufende Nummer:** `ls supabase/migrations/ | tail -3` → nächste vierstellige
   Nummer. Vorher `git fetch` — parallel entstandene Branches können Nummern belegt haben.
3. **Kommentar-Kopf mit Design-Entscheidungen** in jede Migration (warum, nicht nur was) —
   die Migrationen sind das Architektur-Gedächtnis des Projekts.
4. **Backend ist die Wahrheit:** Invarianten (Unlöschbarkeit, Eindeutigkeit, Nummernkreise)
   gehören als Constraint/Trigger/Lock in die DB, nicht (nur) in die UI.

## Pflicht-Schablone für jede neue Tabelle

```sql
create table xyz (
  id uuid primary key default gen_random_uuid(),
  -- … fachliche Spalten mit benannten Constraints (chk_xyz_…) …
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_xyz_updated_at before update on xyz
  for each row execute function set_updated_at();
-- Indizes auf alle Fremdschlüssel!

alter table xyz enable row level security;
create policy xyz_sel on xyz for select using (has_area('<bereich>'));
create policy xyz_ins on xyz for insert with check (can_edit_area('<bereich>'));
create policy xyz_upd on xyz for update using (can_edit_area('<bereich>')) with check (can_edit_area('<bereich>'));
create policy xyz_del on xyz for delete using (can_edit_area('<bereich>'));

-- OHNE GRANTs: still leere Daten/403! Nie anon (0030 hält anon leer).
grant select, insert, update, delete on xyz to authenticated;
grant all on xyz to service_role;

notify pgrst, 'reload schema';
```

Bereiche (`app_area`): inventar, jobs, kunden, angebote (deckt auch Rechnungen ab),
kalender, aufgaben. Muster-Referenz: `0012_auth_roles_and_access.sql`.
Nur-Server-Tabellen (z. B. Versandprotokolle): `authenticated` bekommt nur `select`,
Schreiben ausschließlich `service_role` (Beispiel: `0037_invoice_dunnings.sql`).

## Spezialfälle

- **Lückenlose Nummernkreise** (Rechnungen o. Ä.): Vergabe in einer DB-Funktion mit
  `pg_advisory_xact_lock(hashtext('…jahr…'))`, `select … for update`, `max()+1` im
  gesperrten Abschnitt, idempotent bei Wiederholung. Vorbild: `issue_invoice` in `0036`.
- **Schutz vor Löschen/Ändern** (GoBD): `before update or delete`-Trigger, der bei
  verbotenen Operationen `raise exception` wirft. Vorbild: `protect_issued_invoice`.
- **Edge Functions mit JWT-Pflicht:** in `supabase/config.toml` dokumentiert eintragen;
  lokal werden Functions erst nach `supabase stop && supabase start` aktiv.

## Anwenden & Beweisen (lokal)

```bash
docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/migrations/00XX_name.sql
```

Danach fachlich testen (Szenario aufbauen, Schutzregeln absichtlich verletzen — müssen
scheitern) und bei Locks den **Parallelfall** (zwei gleichzeitige Aufrufe) prüfen.
Details: Skill `feature-fertigstellen`, Abschnitt DB-Beweis. Testdaten wieder löschen.

## Weg in die Cloud

Push auf `main` → GitHub-Action „Supabase DB Migrate (Produktion)" wendet die Migration
automatisch an (triggert auf `supabase/migrations/**`). Danach Erfolg prüfen:
Action grün UND `supabase db query --linked "select … information_schema …" -o table`.
**Nie** `supabase db push` manuell auf Produktion ohne ausdrückliche Freigabe.
Frontend-Code, der die neue Tabelle nutzt, erst pushen, wenn die Migration den Weg in die
Cloud sicher nimmt (gleicher Push ist okay — die Action läuft parallel zum Cloudflare-Build).
