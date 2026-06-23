---
name: eventtech-dev
description: >-
  Runbook für die lokale Entwicklungsumgebung des EventTech-Manager-Projekts
  (selbst-gehostetes Supabase via CLI + Vite-Web-App auf Windows/Docker). Nutze
  diesen Skill IMMER, wenn es ums Hochfahren, Stoppen oder Reparieren der lokalen
  Umgebung geht, oder wenn etwas „nicht funktioniert" / „kein Login" / „kein
  Zugriff": Docker Desktop starten, den Supabase-Stack starten/neu starten, SQL-
  Migrationen auf die laufende DB anwenden, die Edge Function `admin-users` nach
  Änderungen aktivieren, den Dev-Server starten, Netzwerk-/WLAN-Zugriff einrichten
  oder den Erst-Admin bootstrappen. Auch auslösen bei Symptomen wie „Edge Function
  returned a non-2xx status code", „dockerDesktopLinuxEngine: file cannot be
  accessed", `pg_isready`-Fehlern oder leeren/abgewiesenen Logins.
---

# EventTech Manager — Lokale Dev-Umgebung & Supabase-Betrieb

## Mission & Kontext (warum es dieses Projekt gibt)

EventTech Manager ist das **Betriebssystem für einen Eventtechnik-Verleih**: ein Werkzeug,
mit dem das ganze Geschäft eines Veranstaltungstechnik-Betriebs an einem Ort läuft — vom
**Inventar** (Geräte, Sets, Barcodes, Fotos, Zustand/Wartung) über **Kunden &
Anfragen**, **Angebote** und **Jobs/Events** (mit Packlisten, Zeitplan, Geräte- und
Personal-Zuweisung) bis zu **Kalender** und **Aufgaben**. Der rote Faden ist der reale
Arbeitsablauf: **Anfrage → Angebot → Job → (Rechnung)**.

Zwei Leitprinzipien prägen jede technische Entscheidung — und erklären, warum der Betrieb
so aussieht, wie dieser Runbook ihn beschreibt:

- **Selbst gehostet, vollständig unter eigener Kontrolle.** Bewusst keine Fremd-Cloud:
  Supabase läuft lokal in Docker, die Daten liegen im eigenen Volume. Deshalb ist „läuft
  Docker / der Stack überhaupt?" die erste Frage bei Problemen, und deshalb wird der
  Service-Role-Key nur serverseitig (Edge Function) genutzt — nie im Browser.
- **Das Backend ist die Wahrheit.** Rechte werden in der Datenbank per RLS erzwungen
  (Rollen `admin`/`verwaltung`/`mitarbeiter`, Bereichszugriffe, Job-Sichtmodi). Die UI
  blendet nur aus Komfort aus — Sicherheit hängt nie allein an der Oberfläche. Darum wird
  RLS-Verhalten direkt gegen die DB getestet, nicht nur der SQL gelesen.

So ersetzt das Projekt Zettelwirtschaft/Excel durch ein verlässliches, eigenes System,
das den Verleih-Alltag abbildet und dabei Daten und Kontrolle im Haus behält.

## Technischer Überblick

Dieses Projekt ist **selbst gehostet**: ein lokaler Supabase-Stack (über die
`supabase`-CLI in Docker) plus eine Vite/React-Web-App. Es gibt keine Cloud — alle
Daten liegen in einem lokalen Docker-Volume. Viele „es geht nicht mehr"-Momente sind
reine Betriebsfragen (Docker aus, Stack nicht gestartet, Edge Function nicht geladen).
Dieser Runbook fasst die Schritte zusammen, die in diesem Repo wirklich funktionieren.

## Projekt-Fixpunkte (auswendig wichtig)

- **Repo-Wurzel:** `C:\Users\lnu\Documents\eventtech-manager`
- **Web-App:** `apps/web` (Vite, `npm run dev`, Port **5173**)
- **Supabase-Projekt-ID:** `eventtech-manager` → Container heißen `supabase_<dienst>_eventtech-manager`
- **DB-Container:** `supabase_db_eventtech-manager` (Postgres, User `postgres`, DB `postgres`, Port 54322)
- **API-Gateway (Kong):** `http://127.0.0.1:54321` — REST, Auth, Edge Functions, Storage
- **Studio:** `http://127.0.0.1:54323`
- **Migrationen:** `supabase/migrations/NNNN_*.sql` (fortlaufend nummeriert)
- **Edge Functions:** `supabase/functions/<name>/index.ts` (Deno) — aktuell `admin-users`
- **Anon/Publishable Key:** `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- **Erst-Admin (lokal):** `admin@eventtech.local` / `EventTech2026!`

## Umgebung: Bash- vs. PowerShell-Tool

Beide Shells stehen bereit, jede mit eigener Syntax:
- **Bash** (Git Bash) für `docker`, `supabase`, `npm`, `curl`, Heredocs und das Einlesen
  von SQL-Dateien (`< datei.sql`).
- **PowerShell** für Windows-spezifisches: Docker Desktop starten, Prozesse/WLAN prüfen,
  Firewall-Regeln (als Admin).
- **Git-Bash-Falle:** Bei `docker exec ... <absoluter-Linux-Pfad>` wandelt Git Bash den
  Pfad um. Dann `MSYS_NO_PATHCONV=1` voranstellen
  (z. B. `MSYS_NO_PATHCONV=1 docker exec ... find / ...`).

---

## Die wichtigste Diagnose zuerst: Läuft überhaupt etwas?

Bei jedem „geht nicht"-Bericht **immer zuerst** prüfen, ob Docker und die DB laufen —
das ist die häufigste Ursache (z. B. nach PC-Neustart):

```bash
docker ps --filter "name=supabase_db_eventtech" --format "{{.Names}}\t{{.Status}}"
```

- **Fehler `dockerDesktopLinuxEngine: ... file cannot be accessed` / `daemon not running`**
  → Docker Desktop ist aus. Siehe **A) Docker Desktop starten**.
- **Kein Treffer / Container `Exited`** → Stack läuft nicht. Siehe **B) Supabase starten**.
- **`Up ... (healthy)`** → DB läuft. Wenn Login trotzdem scheitert, Auth prüfen:
  ```bash
  curl -s -o /dev/null -w "Auth HTTP %{http_code}\n" http://127.0.0.1:54321/auth/v1/health
  ```
  `200` = Auth ok (Login funktioniert; Problem liegt eher im Browser → neu laden/neu
  einloggen). Kein `200` → Stack neu starten (**B**).

---

## A) Docker Desktop starten (Windows)

Docker Desktop ist **nicht** so eingestellt, dass es automatisch mitläuft. Prüfen und
ggf. starten (PowerShell):

```powershell
if (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue) { "läuft" } else {
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"; "wird gestartet …"
}
```

Danach **1–2 Minuten** warten, bis die Engine bereit ist. Auf Bereitschaft pollen
(Bash) — die Supabase-Container starten i. d. R. automatisch mit hoch:

```bash
for i in $(seq 1 30); do
  if docker exec supabase_db_eventtech-manager pg_isready -U postgres >/dev/null 2>&1; then
    echo "DB bereit nach ~$((i*5))s"; break; fi
  echo "warte… ($i)"; sleep 5
done
```

Kommt die DB nach dem Engine-Start **nicht** von selbst hoch → **B**.

**Harmlose Startmeldungen** (kein echter Fehler, Docker läuft trotzdem):
- `dockerInference / Inference manager` → Docker Model Runner; unter Settings → AI/Beta
  abschaltbar.
- Container `supabase_vector_*` in `Restarting` → bekanntes Windows-Analytics-Phänomen,
  ohne Wirkung auf App/DB/Login. Ignorieren.

## B) Supabase-Stack starten / neu starten

```bash
cd "C:/Users/lnu/Documents/eventtech-manager" && supabase start
```

Ein Neustart (auch nötig, um neue Edge Functions zu laden) erhält die Daten — beim
Start steht „from backup", die Daten kommen aus dem Docker-Volume:

```bash
cd "C:/Users/lnu/Documents/eventtech-manager" && supabase stop && supabase start
```

`supabase status` zeigt alle URLs und Keys (inkl. `SERVICE_ROLE_KEY` für das Bootstrappen).

> **Niemals beiläufig `supabase db reset`** ausführen — das löscht alle lokalen Daten
> und erzwingt erneutes Admin-Bootstrapping (**E**). Nur auf ausdrücklichen Wunsch.

## C) SQL-Migration auf die laufende DB anwenden

Neue Migrationen werden hier **direkt** auf die laufende DB gespielt (nicht über
`db reset`), genau wie die bestehenden:

```bash
cd "C:/Users/lnu/Documents/eventtech-manager" \
  && docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres \
     < supabase/migrations/NNNN_name.sql
```

Erfolg = `CREATE …/ALTER …/CREATE POLICY` ohne `ERROR`. Beachten:
- **Idempotenz/Reihenfolge:** Migrationen bauen aufeinander auf; in numerischer Reihenfolge anwenden.
- **RLS testen** statt nur lesen: Policies wirken anders, als der SQL-Text vermuten lässt.
  Verhalten in einer Transaktion gegen die DB simulieren — siehe
  `references/rls-testing.md`.

## D) Edge Function aktivieren (nach Anlegen/Ändern)

**Kritisch und nicht offensichtlich:** Der Container `supabase_edge_runtime_*` mountet
`supabase/functions` **nur beim Start**. Eine neu erstellte oder geänderte Function wird
**nicht** automatisch übernommen — Aufrufe scheitern dann mit
**„Edge Function returned a non-2xx status code"**.

→ Nach jeder Function-Änderung den Stack einmal neu starten (**B**), dann prüfen:

```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/admin-users \
  -H "apikey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" \
  -H "Content-Type: application/json" -d '{}'
```

Eine **fachliche** Antwort (z. B. `{"error":"Nicht authentifiziert."}`) = Function geladen.
Ein `404`/HTML = nicht geladen → Stack lief nicht neu. (Siehe Memory `edge-function-restart`.)

## E) Erst-Admin bootstrappen (nach `db reset` oder frischer DB)

Sobald RLS scharf ist (Migration 0012+), kommt man nur mit Login an Daten — der erste
Admin muss out-of-band angelegt werden. Vollständige Schritte stehen in
`supabase/BOOTSTRAP_ADMIN.md` (curl gegen die GoTrue-Admin-API mit `SERVICE_ROLE_KEY`
aus `supabase status`, danach `role='admin'` + alle Bereiche per psql). Standard-Zugang
danach: `admin@eventtech.local` / `EventTech2026!` (nach erstem Login ändern).

Weitere Nutzer legt der Admin in der App an (Verwaltung) — über `admin-users`.

## F) Web-App / Dev-Server starten

```bash
cd "C:/Users/lnu/Documents/eventtech-manager/apps/web" && npm run dev
```

App: `http://localhost:5173`. Vite läuft mit `host: true`, ist also auch im LAN
erreichbar. Code-Änderungen greifen per HMR; nur `.env`/`vite.config.ts`-Änderungen
brauchen einen Neustart des Dev-Servers.

## G) Zugriff im lokalen Netz (WLAN)

Damit Handy/Tablet im selben WLAN zugreifen, sind drei Dinge nötig (Details +
HTTPS-Hinweis fürs Kamera-Scannen in `references/lan-access.md`):
1. `apps/web/.env`: `VITE_SUPABASE_URL` auf die **LAN-IP** des Rechners statt `127.0.0.1`.
2. Windows-Firewall (als Admin) für TCP **5173** und **54321** öffnen.
3. Dev-Server neu starten; andere Geräte öffnen `http://<LAN-IP>:5173`.

---

## Verifikation von Code-Änderungen

Vor „fertig" in `apps/web`:

```bash
cd "C:/Users/lnu/Documents/eventtech-manager/apps/web" && npx tsc --noEmit && npx eslint src
```

Bei größeren Änderungen zusätzlich `npx vite build` (fängt Import-/Modulfehler, die `tsc`
nicht sieht). Erst wenn alles grün ist, ist die Aufgabe erledigt.

## Referenzdateien

- `references/rls-testing.md` — RLS-Policies direkt gegen die DB simulieren (Impersonation,
  Transaktion + Rollback), inklusive der Stolperfallen mit `request.jwt.claims`.
- `references/lan-access.md` — WLAN-Freigabe Schritt für Schritt inkl. Firewall-Befehl und
  HTTPS-Hinweis fürs Kamera-Scannen auf dem Handy.
