# Öffentliches Deployment — Cloudflare Pages + Supabase Cloud

> Ziel: Die App läuft **voll öffentlich**, **ohne deinen Laptop**, und wird **automatisch
> aus dem GitHub-Repo** deployt. Dafür wechselt das Backend vom selbst-gehosteten
> Supabase (auf deinem PC, Default-Secrets, nur per Tailscale) auf **Supabase Cloud**
> (gehostet, eigene/einzigartige Secrets, HTTPS, immer erreichbar).

## Warum dieser Wechsel nötig ist

Das bisherige Backend lief auf deinem PC mit **Default-/Shared-JWT-Secrets** — das durfte
nie öffentlich. Eine öffentliche Cloudflare-App braucht aber ein öffentlich erreichbares
Backend. Supabase Cloud löst beides: eigene Secrets (kein Default-Risiko) + HTTPS-Endpunkt,
der nicht von deinem Laptop abhängt. Das RLS-Sicherheitsmodell der App ist bereits solide
(RLS auf allen Tabellen, alle Policies gaten auf Login/Bereichsrechte; `anon` hat seit
Migration `0030` keinerlei Tabellenrechte mehr).

---

## Teil A — Backend: Supabase Cloud (einmalig)

1. **Projekt anlegen** auf https://supabase.com → neues Projekt (Region EU, z. B. Frankfurt).
   Notiere aus *Project Settings → API*:
   - **Project URL** → `https://<ref>.supabase.co`
   - **anon public key**
   - **service_role key** (GEHEIM — nur serverseitig, nie ins Frontend!)

2. **Repo mit dem Cloud-Projekt verknüpfen** (lokal, einmalig):
   ```bash
   supabase link --project-ref <ref>
   ```

3. **Schema/Migrationen in die Cloud pushen** (alle `supabase/migrations/0001…0030`):
   ```bash
   supabase db push
   ```
   Das legt auch die Storage-Buckets an (`device-photos`, `company-assets`, `job-photos`)
   und richtet RLS + Härtung (`0030`) ein. Falls `db push` wegen der lückenhaften
   Migrations-Historie hakt: stattdessen die Dateien der Reihe nach über den SQL-Editor
   im Supabase-Dashboard ausführen.

4. **Edge Functions deployen** (`admin-users`, `calendar-feed`, `public-lead`, `send-dunning`):
   ```bash
   supabase functions deploy
   ```
   Danach die Function-Secrets setzen (Service-Role bleibt damit serverseitig):
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   supabase secrets set RESEND_API_KEY=<resend_key>   # E-Mail: Lead-Benachrichtigung + Mahnwesen
   ```
   (Optional: `DUNNING_FROM` / `LEAD_NOTIFY_FROM` als Absenderadressen; ohne eigene
   verifizierte Resend-Domain wird von `onboarding@resend.dev` gesendet.)

5. **Erst-Admin anlegen**: in *Authentication → Users* einen Nutzer mit E-Mail/Passwort
   erstellen, dann in der DB seine Rolle setzen (SQL-Editor):
   ```sql
   update profiles set role = 'admin' where id = '<user-uuid>';
   ```
   (Profil-Zeile entsteht i. d. R. per Trigger beim Anlegen des Auth-Users; sonst manuell
   einfügen.)

6. **Bestehende Daten übernehmen (optional)**: nur falls die lokalen Inventar-/Job-Daten
   mit sollen — Nutzdaten des `public`-Schemas dumpen und in die Cloud spielen:
   ```bash
   docker exec supabase_db_eventtech-manager pg_dump -U postgres -d postgres \
     --schema=public --data-only --inserts > seed.sql
   # seed.sql danach im Cloud-SQL-Editor ausführen (Reihenfolge/FKs beachten).
   ```
   Auth-User wandern damit NICHT mit — die werden in der Cloud neu angelegt.

---

## Teil B — Frontend: Cloudflare Pages aus GitHub

1. **Pages-Projekt mit GitHub verbinden** (statt manuellem `wrangler deploy`):
   Cloudflare Dashboard → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* →
   Repo wählen. Damit deployt jeder Push auf `main` automatisch.

2. **Build-Einstellungen:**
   - **Root directory:** `apps/web`
   - **Build command:** `pnpm install && pnpm build`
   - **Build output directory:** `dist`

3. **Environment-Variablen** (Pages → Settings → *Environment variables*, für *Production*):
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<anon public key>`
   - (optional) `VITE_CALENDAR_FEED_BASE_URL` = öffentliche Feed-URL, falls genutzt
   > Diese Variablen werden beim **Build** eingebacken — ohne sie bleibt die Seite schwarz
   > (genau der bisherige Fehler: der anon-Key fehlte, weil `.env` gitignored ist).
   > **Niemals** den `service_role`-Key hier eintragen — der gehört nur in Edge-Function-Secrets.

4. **SPA-Routing:** ist über `apps/web/public/_redirects` (`/* /index.html 200`) bereits im
   Repo — sorgt dafür, dass Unterseiten beim Direktaufruf/Reload nicht 404en.

5. **Supabase-CORS:** in Supabase *Authentication → URL Configuration* die Pages-Domain
   (`https://eventtech-web.pages.dev` bzw. eigene Domain) als *Site URL* / *Redirect URL*
   eintragen, damit Login/Sessions sauber laufen.

---

## Teil C — Alltag: lokal testen → pushen → live

Es gibt **zwei getrennte Welten**, die App entscheidet allein über Env-Variablen, mit
welchem Backend sie spricht — du musst nichts umstellen:

| | Lokal (dein Rechner) | Produktion (Cloudflare) |
|---|---|---|
| Backend | Docker-Supabase (`localhost:54321`) | Supabase Cloud |
| Frontend | `pnpm dev` | Cloudflare Pages |
| Env | `apps/web/.env` (lokaler anon-Key, URL wird automatisch abgeleitet) | Pages-Env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |

**Der Ablauf:**
1. Lokales Supabase läuft (siehe `eventtech-dev`-Skill) → `pnpm dev` → Feature bauen & testen.
2. `git add -A && git commit && git push` auf `main`.
3. **Frontend** wird automatisch deployt — sobald das Pages-Projekt per *Connect to Git*
   mit dem Repo verbunden ist (einmalige Einrichtung, Teil B). Jeder Push → neuer Build → live.
4. **Datenbank**: Enthält der Push eine neue Datei unter `supabase/migrations/**`, spielt der
   GitHub-Action `.github/workflows/db-migrate.yml` sie automatisch in die Cloud-DB.

> **Wichtig — Schema-Gleichlauf:** Neue Spalten/Tabellen immer als Migration unter
> `supabase/migrations/` anlegen (nie nur per Hand in der lokalen DB), sonst kennt die Cloud
> sie nicht und die Live-App bricht. Lokal wie bisher anwenden, in die Cloud kommt sie über
> den Action automatisch.

**Einmalige GitHub-Secrets** für den DB-Action (Repo → Settings → Secrets and variables → Actions):
- `SUPABASE_ACCESS_TOKEN` — Supabase-Account → Access Tokens
- `SUPABASE_DB_PASSWORD` — DB-Passwort des Cloud-Projekts
- `SUPABASE_PROJECT_REF` — Projekt-Ref
Solange diese fehlen, läuft der Action grün durch und überspringt die Migration.

> Hinweis: Der `service_role`-Key wird hier NICHT gebraucht und gehört auch nicht in
> GitHub-Secrets fürs Frontend — nur in die Edge-Function-Secrets (Teil A).

---

## Teil D — Backup & Restore (automatisch)

Die Cloud-Datenbank wird **automatisch täglich** gesichert — ohne dein Zutun. Zuständig ist
der GitHub-Action `.github/workflows/db-backup.yml` (ROADMAP P0.1). Er nutzt **dieselben
Secrets** wie die Migration (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
`SUPABASE_PROJECT_REF`) — sind die gesetzt, läuft das Backup ohne weitere Einrichtung;
fehlen sie, überspringt der Action grün.

**Was gesichert wird — zwei Artefakte je Lauf:**

- **Stufe 1 — Datenbank** (`db-backup-<datum>`): drei Teile — `01_roles.sql` (Rollen),
  `02_schema.sql` (Struktur), `03_data.sql` (alle Daten, inkl. **Logins** aus `auth.users`)
  plus `00_manifest.txt`.
- **Stufe 2 — Storage-Dateien** (`storage-backup-<datum>`, seit 2026-07-18): **alle**
  Buckets mit ihren Dateien — Fotos, Dokumente, Firmenlogo — plus Manifest mit Anzahl und
  Größe je Bucket.

> Die Bucket-Liste wird **dynamisch** ermittelt: ein später angelegter Bucket wandert
> automatisch ins Backup, ohne dass jemand den Workflow anfassen muss.
>
> **Wachposten:** Übersteigt das Storage-Backup **2 GB**, bricht der Schritt **absichtlich
> mit Fehler ab** — dann gehören die Dateien auf ein externes Ziel (z. B. Cloudflare R2)
> statt in GitHub-Artefakte. Lieber ein lauter Fehler als ein stilles Teil-Backup. Ab 1 GB
> gibt es vorher eine Warnung.

**Ablage & Rotation:** Jeder Lauf legt das Backup als **Artefakt** am Action-Lauf ab
(Repo → *Actions* → *Supabase DB Backup (Produktion)* → gewünschter Lauf → *Artifacts*).
Aufbewahrung **90 Tage**, danach verfällt es automatisch (das ist die Rotation).

> ### ⚠️ Grün heißt NICHT gesichert
>
> Der Workflow ist „ruhig by default": **fehlen die Secrets, überspringt er alles und wird
> trotzdem grün.** Ein grüner Haken in der Actions-Liste ist deshalb **kein Beleg**, dass
> ein Backup existiert — er kann auch bedeuten, dass seit Wochen nichts gesichert wird.
>
> **Woran man ein echtes Backup erkennt** (mindestens einmal im Quartal prüfen):
> 1. Am Lauf hängt ein **Artefakt** `db-backup-<datum>_<zeit>` — fehlt es, wurde nichts
>    gesichert.
> 2. Die **Zusammenfassung** des Laufs zeigt das Manifest mit Zeilenzahlen; steht dort
>    „Supabase-Secrets noch nicht gesetzt – Backup uebersprungen", ist es ein Leerlauf.
> 3. Das Artefakt ist **nicht winzig** (eine gefüllte DB liegt deutlich über wenigen kB).
>
> *Stand 2026-07-18:* geprüft — Artefakt `db-backup-2026-07-18_0534` (26 kB) existiert,
> per Zeitplan ohne menschliches Zutun entstanden. Das Backup läuft also wirklich.

**Sofort ein Backup ziehen (manuell):** Repo → *Actions* → *Supabase DB Backup
(Produktion)* → *Run workflow*. Nach ~1–2 Minuten liegt das Artefakt am Lauf.

**Wiederherstellen (Restore-Weg):** Backup-Artefakt herunterladen und entpacken, dann
einspielen — Reihenfolge Rollen → Schema → Daten:
```bash
psql "<ziel-connection-string>" -f 01_roles.sql   # Rollen (Fehler bei vorhandenen Rollen sind ok)
psql "<ziel-connection-string>" -f 02_schema.sql   # Struktur
psql "<ziel-connection-string>" -f 03_data.sql     # Daten
```

> ### ⚠️ Das Ziel muss eine **Supabase-Instanz** sein, keine leere Datenbank
>
> **Real geprobt am 2026-07-18** (ROADMAP P0.2) — mit einem echten Cloud-Dump. Wichtigste
> Erkenntnis: Der Restore in eine frisch angelegte, **nackte** Postgres-Datenbank
> (`create database …`) **scheitert** — 109 Fehler. Grund: Das Backup enthält nur die
> **eigenen** Objekte und setzt die Supabase-Plattform-Schemas `auth`, `extensions` und
> `vault` sowie deren Extensions als **vorhanden** voraus.
>
> **Richtiges Ziel ist deshalb ein frisches Supabase-Projekt** (Cloud: neues Projekt
> anlegen; lokal: `supabase start` auf einer leeren Instanz). Dort sind Plattform-Schemas,
> `auth.users` und Extensions bereits da.
>
> **Was der Drill sonst gezeigt hat:**
> - ✅ **Inhaltlich vollständig:** `auth.users` (alle Logins), sämtliche Fachtabellen,
>   `storage.objects` **und** `storage.buckets` sind im Dump enthalten.
> - ✅ **Schutzmechanismen kommen mit zurück:** 31 Tabellen mit RLS, 113 Policies,
>   46 Fremdschlüssel, 16 Trigger, 46 Funktionen — inklusive `issue_invoice()`,
>   `can_see_document()` und `has_area()`.
> - ✅ **Der pg_dump-Warnhinweis** („might not be able to restore without
>   `--disable-triggers`") hat sich **nicht** materialisiert: Die Daten liefen ohne
>   Constraint-Fehler durch. Falls es doch einmal klemmt, ist `--disable-triggers` beim
>   Daten-Schritt der dokumentierte Ausweg.
> - ⚠️ **Verweise ins Leere:** `storage.objects` wird wiederhergestellt, **die Dateien
>   aber nicht** (Stufe 2 fehlt noch). Nach einem Restore zeigt z. B. der Eintrag für das
>   **Firmenlogo** (`company-assets/…jpg`) auf eine nicht existierende Datei — und das
>   Logo steckt in jedem Rechnungs- und Angebots-PDF.
>
> **Vollständige Buckets-Liste** (für Stufe 2 wichtig): `company-assets` (public),
> `device-photos` (public), `job-photos` (public), `device-documents` (privat),
> `documents` (privat).

---

## Checkliste „geht live"

- [ ] `supabase db push` lief durch; im Cloud-Dashboard sind Tabellen + Buckets da.
- [ ] `anon` hat keine Tabellenrechte (Migration `0030` angewandt).
- [ ] Edge Functions deployt, `service_role`-Secret gesetzt.
- [ ] Admin-User existiert und kann sich einloggen.
- [ ] Pages: Root `apps/web`, Output `dist`, `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` gesetzt.
- [ ] Pages-Domain als Site/Redirect-URL in Supabase hinterlegt.
- [ ] Seite lädt (nicht mehr schwarz), Login funktioniert, Daten erscheinen.

## Sicherheit (Kurzfassung)

- `service_role`-Key **nur** in Edge-Function-Secrets — nie im Frontend/Repo.
- RLS bleibt die Wahrheit; `anon` ist gehärtet (`0030`).
- Der Laptop/das lokale Docker-Supabase ist für den Produktivbetrieb **nicht** mehr nötig
  (bleibt nur für lokale Entwicklung, siehe `eventtech-dev`-Skill).
