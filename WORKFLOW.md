# Feature-Workflow — lokal entwickeln → pushen → live

Setup-Architektur: lokal entwickelst du gegen **Docker-Supabase**, die Live-App auf
**Cloudflare Pages** spricht mit **Supabase Cloud**. Die App wählt das Backend automatisch
über Env-Variablen — du stellst nichts um. Details/Erstinstallation: `DEPLOY.md`.

## 1. Lokale Umgebung starten
- Docker Desktop starten, dann den Supabase-Stack hochfahren (Skill `eventtech-dev`):
  `supabase start`
- Dev-Server: `pnpm dev` → http://localhost:5173

## 2. Feature bauen
- Code in `apps/web/src/...` ändern.

## 3. Nur falls es eine DB-Änderung braucht (neue Spalte/Tabelle/Bucket)
1. **Neue Migrationsdatei** anlegen, fortlaufend nummeriert:
   `supabase/migrations/00XX_kurzer_name.sql` (nächste freie Nummer; non-destruktiv).
2. **Lokal anwenden**:
   ```bash
   docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres \
     -v ON_ERROR_STOP=1 < supabase/migrations/00XX_kurzer_name.sql
   ```
   Nach DDL einmal: `notify pgrst, 'reload schema';`
3. **Neue Tabellen** brauchen: RLS an + Policies nach dem Muster aus
   `0012_auth_roles_and_access.sql` (`has_area()` / `can_edit_area()` / `is_admin()`),
   GRANTs an `authenticated, service_role` — **nicht** an `anon` (Härtung 0030).
4. Niemals nur von Hand in der DB ändern — sonst kennt die Cloud das Feld nicht und die
   Live-App bricht. Immer als Migrationsdatei, die mitcommittet wird.

## 4. Verifizieren (Pflicht vor jedem Commit — nie roten Stand pushen)
```bash
cd apps/web
npx tsc --noEmit
npx eslint <geänderte Dateien>
npx vite build
```

## 5. Lokal testen
Im Browser durchklicken (Login, betroffener Bereich).

## 6. Commit & Push
```bash
git add -A
git commit -m "<was + warum>"   # Trailer: Co-Authored-By: Claude <noreply@anthropic.com>
git push
```

## 7. Was beim Push automatisch passiert
- **Frontend:** Cloudflare Pages baut & deployt automatisch → https://eventtech-web.pages.dev
- **Datenbank:** Liegt eine neue Datei unter `supabase/migrations/**`, spielt der GitHub-Action
  `.github/workflows/db-migrate.yml` sie in die Cloud-DB (sobald die 3 GitHub-Secrets gesetzt
  sind: `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`).
  Ohne Secrets: Migration manuell hochladen mit `supabase db push`.

## 8. Sonderfall: Edge Function geändert
Edge Functions deployen **nicht** automatisch beim Push. Nach Änderungen unter
`supabase/functions/**`:
```bash
supabase functions deploy            # alle, oder gezielt: supabase functions deploy <name>
```
(Lokal werden sie erst nach `supabase stop && supabase start` aktiv.)

## 9. Live prüfen
https://eventtech-web.pages.dev öffnen (ggf. privates Fenster) und das Feature checken.

---

### Spickzettel
```
supabase start            # lokales Backend
pnpm dev                  # lokal entwickeln
# (ggf. Migration anlegen + lokal per psql anwenden)
cd apps/web && npx tsc --noEmit && npx eslint . && npx vite build
git add -A && git commit -m "..." && git push     # -> Cloudflare + DB-Action deployen automatisch
# bei Edge-Function-Änderung zusätzlich: supabase functions deploy
```
