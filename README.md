# EventTech Manager

Business-Software für ein kleines Veranstaltungstechnik-Unternehmen (2–3 Personen).
Deckt den kompletten Ablauf ab: Kunde → Anfrage → Job → Packliste per Barcode →
Kalender (automatisch) → Ausgabe/Rückgabe → (Rechnung, noch offen). Läuft
selbst-gehostet, komplett auf Deutsch, **ohne Login** (bewusst — siehe unten).

## Status

**Grundgerüst + mehrere Ausbaustufen fertig.** Inventar, Jobs, Kunden/CRM und
Kalender sind mit echter Supabase-Anbindung umgesetzt, inklusive:

- Barcode-Scanning (Kamera + USB-Scanner) und Packlisten mit Ausgabe/Rückgabe-Tracking
  (inkl. Schadensvermerk)
- Dashboard mit Tages-/anstehenden Jobs, Gerätestatus, fälligen Aufgaben
- Kalender mit Monats-/Wochen-/Tagesansicht, automatischem Eintrag bei Job-Anlage,
  ganztägigen/mehrtägigen Balken, Unterevents (Milestones) und
  Doppelbuchungs-Warnung direkt in der Packliste
- Aufgabenverwaltung (Notizen oder Checkliste, abhakbar, Drag-to-reorder, Lock-Modus)
- Foto-Upload bei Geräten (beim Anlegen)
- Kategorien-Verwaltung im UI (anlegen/löschen)

**Bewusst kein Login/Auth.** Die App läuft nur mit dem `anon`-Key, Row Level
Security ist dauerhaft deaktiviert (Migration `0006`). Das ist für den
Solo-/Kleinteam-Betrieb auf einem selbst kontrollierten Server gedacht — nicht
für öffentliches Internet ohne zusätzlichen Schutz (z. B. VPN, Reverse-Proxy
mit Basic-Auth).

**Noch nicht gebaut:**

- **Rechnungsstellung** — kein Schema, kein UI. Das Dashboard zeigt dafür
  bewusst einen ehrlichen Platzhalter statt erfundener Zahlen.
- **Angebot als echtes Dokument** — die Anfragen-Pipeline kennt den Status
  „Angebot gesendet", aber es wird kein PDF/Dokument erzeugt.
- Foto-/Dokument-Upload **nachträglich** an bereits angelegten Geräten (aktuell
  nur beim Anlegen möglich)
- Service Worker / echte PWA-Offlinefähigkeit
- Google-Calendar-Sync
- Tauri/Capacitor sind konfiguriert, aber nie gebaut/getestet (fehlende
  Toolchains in der Entwicklungsumgebung)

## Architektur

Eine React/TypeScript-Codebase (`apps/web`), perspektivisch von drei Wrappern
nutzbar:

- **Browser**: läuft direkt aus `apps/web`, das ist der aktuell genutzte Weg
- **Desktop (Windows/Linux)**: Tauri v2, Konfiguration in `apps/web/src-tauri` (ungetestet)
- **Android**: Capacitor v6, Konfiguration in `apps/web/capacitor.config.ts` (ungetestet)

Backend: Supabase, lokal via Docker (Supabase CLI). Schema in `supabase/migrations`,
8 Migrationen, 13 Tabellen (Geräte, Barcodes, Fotos/Dokumente, Kunden, Anfragen,
Jobs, Packliste, Kalender, Aufgaben + Checklisten, Job-Milestones).

## Setup auf einem neuen Rechner

Du hast die Dependencies (`pnpm install`) bereits installiert. Es fehlen noch:
Supabase CLI + Docker, das lokale Backend starten, und die `.env`-Datei.

### 1. Voraussetzungen

- **Docker** (Docker Desktop oder Docker Engine) muss laufen — Supabase startet
  seine Dienste (Postgres, Auth, Storage, PostgREST …) als Container.
- **Supabase CLI** installieren, falls noch nicht vorhanden:

  ```bash
  npm install -g supabase
  # oder: brew install supabase/tap/supabase  (macOS)
  ```

### 2. Lokales Supabase-Backend starten

Im Ordner `eventtech-manager` (Repo-Root):

```bash
supabase start
```

Das zieht beim ersten Mal die Docker-Images (kann etwas dauern) und spielt
automatisch alle Migrationen aus `supabase/migrations/` ein. Am Ende gibt die
CLI eine Übersicht aus — wichtig sind:

```
API URL: http://127.0.0.1:54321
anon key: eyJ...
```

Diese beiden Werte brauchst du für die `.env`-Datei (Schritt 3).

> **Tipp:** Falls du dir die Werte später noch einmal anzeigen lassen willst,
> ohne neu zu starten: `supabase status`.

### 3. Umgebungsvariablen setzen

```bash
cd apps/web
cp .env.example .env
```

`.env` mit den Werten aus Schritt 2 befüllen:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<der anon key aus "supabase start">
```

### 4. (Optional) Beispieldaten laden

Verbindungsdaten zur lokalen DB anzeigen lassen:

```bash
supabase status
```

Dort steht eine `DB URL` (Standard lokal: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`).
Damit die Seed-Daten einspielen:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed/seed.sql
```

(Passwort und Port können abweichen, falls in `supabase/config.toml` angepasst —
dann die `DB URL` aus `supabase status` verwenden statt der Beispiel-URL oben.)

### 5. Entwicklungsserver starten

Im Repo-Root:

```bash
pnpm dev
```

Läuft auf **http://localhost:5173**.

### Bei jedem weiteren Arbeitstag

Docker-Container laufen nicht permanent im Hintergrund — vor der Arbeit kurz:

```bash
supabase start   # falls die Container nicht schon laufen
pnpm dev
```

Zum Beenden: `supabase stop` (Daten bleiben erhalten, solange du nicht
`supabase stop --no-backup` oder `db reset` nutzt).

### Troubleshooting

- **„permission denied" nach `supabase db reset`**: sollte durch Migration
  `0006_disable_rls_local_dev.sql` nicht mehr auftreten, da sie automatisch
  mit eingespielt wird. Falls doch: PostgREST-Schema-Cache ist veraltet →
  `supabase stop && supabase start`, oder per SQL: `NOTIFY pgrst, 'reload schema';`
- **Ports schon belegt**: `supabase start` nutzt feste Ports (54321 API, 54322
  DB, 54323 Studio …). Falls ein anderes lokales Supabase-Projekt läuft,
  vorher `supabase stop` in dessen Ordner ausführen.
- **`pnpm dev` findet `.env` nicht**: Die Datei muss in `apps/web/.env` liegen,
  nicht im Repo-Root.

## Build pro Plattform

### Web

```bash
pnpm build
# Output in apps/web/dist
```

Für echte PWA-Installierbarkeit fehlt noch ein Service Worker (z. B. via
vite-plugin-pwa) — aktuell ist nur das Manifest vorhanden.

### Desktop (Tauri) — ungetestet

Voraussetzung: Rust-Toolchain (rustup) plus Tauri-Systemabhängigkeiten für
Linux (webkit2gtk etc.) bzw. Windows.

```bash
cd apps/web
pnpm tauri build
```

Icons in `src-tauri/icons/` fehlen noch — vor dem ersten Release-Build mit
`pnpm tauri icon <pfad-zu-logo.png>` generieren.

### Android (Capacitor) — ungetestet

Voraussetzung: Android Studio + Android SDK.

```bash
cd apps/web
pnpm build
npx cap add android
npx cap sync android
npx cap open android
```

## Projektstruktur

```
eventtech-manager/
├── apps/web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            Basis-UI (Button, Card, Dialog, Input, Badges)
│   │   │   ├── layout/        Sidebar, BottomNav, AppShell, PageHeader
│   │   │   ├── barcode/       Kamera-Scanner, USB-Scanner-Hook, Label-Druck
│   │   │   ├── inventory/     Geräte-/Kategorien-Komponenten
│   │   │   ├── jobs/          Job-spezifische Komponenten (Packliste, Milestones, Farbe)
│   │   │   ├── customers/     CRM-Komponenten (Liste, Kanban-Pipeline)
│   │   │   ├── calendar/      Monats-/Wochen-/Tagesansicht, Termin-Dialog
│   │   │   └── tasks/         Aufgaben-Dialoge (Anlegen, Detail mit Lock-Modus)
│   │   ├── pages/             Hauptseiten (Dashboard, Inventar, Jobs, Kunden, Kalender, Aufgaben, Scan) + Detailseiten
│   │   ├── hooks/             TanStack Query Hooks (1 Datei pro Domäne)
│   │   ├── lib/               Supabase-Client, Formatierung, iCal-Export, Utilities
│   │   └── types/             TypeScript-Typen, spiegeln das DB-Schema
│   ├── src-tauri/             Tauri Desktop-Wrapper (Rust, ungetestet)
│   └── capacitor.config.ts    Android-Wrapper-Konfiguration (ungetestet)
└── supabase/
    ├── migrations/            SQL-Schema (Tabellen, ENUMs, RLS-Deaktivierung, Storage)
    └── seed/                  Beispieldaten für lokale Entwicklung
```

## Bekannte Lücken / nächste Schritte

In Reihenfolge der Mission (Anfrage → Job → Technik → Geld):

1. **Tagesmietpreis bei Geräten** — fehlt als Feld, ist aber Voraussetzung
   dafür, dass Angebote/Rechnungen Beträge automatisch vorschlagen können.
2. **Rechnungsstellung** — größter offener Baustein. Geplant: Generierung aus
   der Packliste eines Jobs, Status-Workflow (Entwurf → versendet → bezahlt),
   PDF-Export.
3. **Angebot als echtes Dokument** — aus einer Anfrage heraus erzeugen,
   bei Annahme in einen Job + Rechnungsvorlage überführen.
4. **Foto-/Dokument-Upload nachträglich** an bestehenden Geräten (aktuell nur
   beim Neuanlegen möglich).
5. **Google Calendar Sync** — `calendar_source`-ENUM ist vorbereitet, aber es
   gibt noch keine Edge Function/OAuth-Flow. Token-Refresh und
   Konflikt-Auflösung bei beidseitigen Änderungen brauchen einen eigenen
   Design-Pass.
6. **Service Worker für PWA**.
7. **Tauri-Icons** fehlen (Platzhalter-Pfade in `tauri.conf.json`).

Weitere, noch nicht terminierte Ideen (Auslastungs-Übersicht, Geräte-Sets/Pakete,
Wartungshistorie, Rückgabe-Reminder im Dashboard, Druckansicht für Packlisten)
sind besprochen, aber noch nicht eingeplant.

