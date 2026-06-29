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

4. **Edge Functions deployen** (`admin-users`, `calendar-feed`):
   ```bash
   supabase functions deploy admin-users
   supabase functions deploy calendar-feed
   ```
   Danach die Function-Secrets setzen (Service-Role bleibt damit serverseitig):
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   ```
   (Weitere Secrets je nach Function — prüfen, was `supabase/functions/*/index.ts` erwartet.)

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
