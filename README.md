# EventTech Manager

Business-Software für einen kleinen Veranstaltungstechnik-Verleih. Deckt den kompletten
Arbeitsablauf ab: **Kunde → Anfrage → Angebot → Job → Packliste (per Barcode) → Kalender →
Ausgabe/Rückgabe**. Deutschsprachig, Dark-Theme, mit Login & Rollen.

> **Live:** das Frontend läuft öffentlich auf **Cloudflare Pages**
> (`eventtech-web.pages.dev`, eigene Domain `manage.eventtechnik-fk.de`), das Backend auf
> **Supabase Cloud**. Lokal wird gegen ein **selbst-gehostetes Supabase** (Docker) entwickelt.
> Den genauen Entwicklungs-/Deploy-Ablauf beschreibt **`WORKFLOW.md`**, die einmalige
> Cloud-Einrichtung **`DEPLOY.md`**.

## Funktionsumfang

- **Inventar** — Geräte mit Kategorien, Lagerorten (als Pillen), Fotos, Stückzahlen,
  abgeleiteter Verfügbarkeit (`Bestand − defekt − in aktiven Jobs`), Kauf-/Tagesmietpreis,
  Geräte-/Lagerort-Historie, CSV-Import/-Export, Geräte-Sets/Pakete.
- **DGUV-V3-Elektroprüfung** — letzte/nächste Prüfung pro Gerät, Fälligkeits-Erinnerung.
- **Barcode** — Kamera- & USB-Scanner, interne ETM-Codes, Etiketten-Druck; Scan springt
  direkt zum Gerät.
- **Jobs** — Packlisten mit Packen/Rückgabe-Tracking (Pflicht-Lagerort, Schadensvermerk),
  Zeitplan/Programmpunkte (mit Foto), Personal-/Geräte-Zuweisung, Job-Farben,
  „Vergangen"-Ordner und **Papierkorb** (Soft-Delete mit Wiederherstellen).
- **Kunden/CRM** — Stammdaten (bearbeitbar), Notizen, Anfragen-Pipeline (Kanban),
  automatische Stammkunden-Erkennung.
- **Angebote** — Positionen, MwSt, Status, **PDF-Export** mit Firmenkopf & **Logo**;
  direkt aus einer Packliste erzeugbar; am Job/Kunden gespeichert; bearbeitbar.
- **Kalender** — Monats-/Wochen-/Tagesansicht, automatischer Eintrag bei Job-Anlage,
  ganztägige/mehrtägige Balken, Zeitplan-Termine, Doppelbuchungs-Warnung, Abo-Link
  (iCal/Google/Apple, read-only).
- **Aufgaben** — Notiz- oder Checklisten-Aufgaben, abhakbar, Job-bezogen.
- **Verwaltung (Admin)** — Benutzer/Rollen/Bereichszugriffe, Firmendaten & Logo,
  Passwort-Reset.

## Architektur & Sicherheit

- **Monorepo (pnpm).** Web-App `apps/web` (`@eventtech/web`): Vite + React + TypeScript +
  TanStack Query + Tailwind. Backend: Supabase (`supabase/`).
- **„Das Backend ist die Wahrheit."** Rechte werden per **RLS** in Postgres erzwungen
  (Rollen `admin`/`verwaltung`/`mitarbeiter`, Bereichszugriffe über
  `has_area()`/`can_edit_area()`/`is_admin()`, siehe `supabase/migrations/0012_*`). Die UI
  blendet nur zusätzlich aus. `anon` hat keine Tabellenrechte (Härtung `0030`).
- **Zwei Umgebungen:** lokal Docker-Supabase (`localhost:54321`), Produktion Supabase Cloud.
  Das Frontend wählt das Backend automatisch über `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` — lokal aus `apps/web/.env`, in der Cloud aus den Pages-Env-Variablen.
- **Service-Role-Key nur serverseitig** (Edge Functions: `admin-users`, `calendar-feed`) — nie im Frontend.
- Wrapper für **Desktop (Tauri)** / **Android (Capacitor)** sind konfiguriert, aber ungetestet.

## Lokale Entwicklung

Voraussetzungen: **Docker Desktop** + **Supabase CLI** + **Node ≥ 22** + **pnpm**.

```bash
# 1. Lokales Backend starten (Repo-Wurzel)
supabase start

# 2. Dev-Server (Repo-Wurzel)
pnpm dev            # http://localhost:5173
```

- `apps/web/.env` ist bewusst minimal: ohne `VITE_SUPABASE_URL` leitet die App die
  Backend-Adresse automatisch vom Hostnamen ab (`localhost`/LAN-IP) — läuft so out of the box.
- **Erst-Admin lokal** anlegen: siehe Skill `eventtech-dev` bzw. `supabase/BOOTSTRAP_ADMIN.md`.
- Bei „geht nicht"/Umgebungsproblemen: **Skill `eventtech-dev`** (Docker/Stack/Migrationen/Admin).

Verifikation vor jedem Commit (nie roten Stand pushen):

```bash
cd apps/web && npx tsc --noEmit && npx eslint src && npx vite build
```

## Datenbank / Migrationen

- SQL-Schema in `supabase/migrations/NNNN_*.sql` (aktuell bis **0030**), fortlaufend, non-destruktiv.
- **Lokal anwenden** (die Tracking-Tabelle hängt zurück — nicht `supabase migration up`):
  ```bash
  docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres \
    -v ON_ERROR_STOP=1 < supabase/migrations/NNNN_name.sql
  # nach DDL: notify pgrst, 'reload schema';
  ```
- **In die Cloud** kommen Migrationen automatisch beim Push (GitHub-Action
  `.github/workflows/db-migrate.yml`) bzw. manuell via `supabase db push`.
- Neue Tabellen: RLS an + Policies nach Muster `0012`, GRANTs an `authenticated, service_role`
  (nicht `anon`).

## Deployment (Kurzfassung)

- **Frontend:** Cloudflare Pages, mit dem GitHub-Repo verbunden → jeder Push auf `main`
  baut & deployt automatisch (`pnpm install && pnpm --filter @eventtech/web build`, Output
  `apps/web/dist`, `NODE_VERSION=22`).
- **Backend:** Supabase Cloud (Projekt-Ref `pcyhumjbkdtzgjwuvyal`).
- Vollständige Einrichtung & Secrets: **`DEPLOY.md`**. Alltäglicher Feature-Ablauf: **`WORKFLOW.md`**.

## Projektstruktur

```
eventtech-manager/
├── apps/web/                 Vite/React-App (@eventtech/web)
│   ├── src/
│   │   ├── components/       ui/ layout/ barcode/ inventory/ jobs/ customers/ calendar/ tasks/ offers/
│   │   ├── pages/            Dashboard, Inventar, Jobs, Kunden, Kalender, Aufgaben, Angebote, Scan, Admin + Details
│   │   ├── hooks/            TanStack-Query-Hooks (1 Datei pro Domäne)
│   │   ├── lib/              Supabase-Client, Formatierung, PDF, iCal, Utilities
│   │   ├── auth/             AuthProvider + Router-Guards
│   │   └── types/            TypeScript-Typen (spiegeln das DB-Schema)
│   ├── public/_redirects     SPA-Routing für Cloudflare Pages
│   ├── src-tauri/            Desktop-Wrapper (ungetestet)
│   └── capacitor.config.ts   Android-Wrapper (ungetestet)
├── supabase/
│   ├── migrations/           SQL-Schema (bis 0030)
│   └── functions/            Edge Functions (admin-users, calendar-feed)
├── .github/workflows/        db-migrate.yml (Cloud-Migrationen bei Push)
├── CLAUDE.md  WORKFLOW.md  DEPLOY.md  ARBEITSWEISE.md
```

## Offene Punkte / Backlog

Aktueller Stand & Verlauf: `IDEAS.md` (Backlog + „Kürzlich umgesetzt"), großer Nordstern:
`ROADMAP.md`, aktives Großvorhaben: `PLAN-NEUAUSRICHTUNG.md`.
