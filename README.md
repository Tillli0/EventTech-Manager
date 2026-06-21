# EventTech Manager

Business-Software für Veranstaltungstechnik-Unternehmen. Ersetzt easyjob/HireHop,
läuft auf eigener Infrastruktur.

## Status

**Phase 1 (MVP) — Grundgerüst fertig.** Alle vier Phase-1-Seiten (Inventar, Jobs,
Kunden/CRM, Kalender) sind mit echter Supabase-Anbindung umgesetzt, inklusive
Barcode-Scanning (Kamera + USB-Scanner).

Nicht enthalten in dieser Runde: Tauri/Capacitor wurden konfiguriert, aber noch
nicht getestet (kein Build auf dieser Maschine möglich, da Rust/Android SDK fehlen).
Google-Calendar-Sync ist noch nicht angebunden — aktuell nur interner Kalender +
iCal-Export.

## Architektur

Eine React/TypeScript-Codebase (`apps/web`) wird von drei Wrappern genutzt:

- **Browser & iOS**: PWA, direkt aus `apps/web` (kein App Store nötig)
- **Desktop (Windows/Linux)**: Tauri v2, Konfiguration in `apps/web/src-tauri`
- **Android**: Capacitor v6, Konfiguration in `apps/web/capacitor.config.ts`

Backend: Supabase (selbst gehostet), Schema in `supabase/migrations`.

## Setup

### 1. Dependencies installieren

```bash
pnpm install
```

### 2. Supabase-Schema einspielen

Auf eurem selbst gehosteten Supabase-Server (oder lokal via Supabase CLI):

```bash
supabase db push
# oder direkt per psql gegen die DB:
psql "$DATABASE_URL" -f supabase/migrations/0001_phase1_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls_policies.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_storage_buckets.sql

# Optional: Beispieldaten für lokale Entwicklung
psql "$DATABASE_URL" -f supabase/seed/seed.sql
```

### 3. Umgebungsvariablen setzen

```bash
cd apps/web
cp .env.example .env
# .env mit eurer Supabase-URL und dem anon key befüllen
```

### 4. Entwicklung starten

```bash
pnpm dev
# läuft auf http://localhost:5173
```

## Build pro Plattform

### Web / PWA

```bash
pnpm build
# Output in apps/web/dist
```

Für echte PWA-Installierbarkeit fehlt noch ein Service Worker (z.B. via
vite-plugin-pwa) — aktuell ist nur das Manifest vorhanden.

### Desktop (Tauri)

Voraussetzung: Rust toolchain (rustup) plus Tauri-Systemabhängigkeiten für
Linux (webkit2gtk etc.) bzw. Windows.

```bash
cd apps/web
pnpm tauri build
```

Icons in `src-tauri/icons/` fehlen noch — vor dem ersten Release-Build mit
`pnpm tauri icon <pfad-zu-logo.png>` generieren.

### Android (Capacitor)

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
│   │   │   ├── inventory/     Geräte-spezifische Komponenten
│   │   │   ├── jobs/          Job-spezifische Komponenten (Packliste etc.)
│   │   │   ├── customers/     CRM-Komponenten (Liste, Kanban-Pipeline)
│   │   │   └── calendar/      Kalender-Komponenten (Monatsgrid, Dialog)
│   │   ├── pages/             Die 4 Phase-1-Hauptseiten + Detailseiten
│   │   ├── hooks/             TanStack Query Hooks (1 Datei pro Domäne)
│   │   ├── lib/                Supabase-Client, Formatierung, Utilities
│   │   └── types/              TypeScript-Typen, spiegeln das DB-Schema
│   ├── src-tauri/              Tauri Desktop-Wrapper (Rust)
│   └── capacitor.config.ts     Android-Wrapper-Konfiguration
└── supabase/
    ├── migrations/             SQL-Schema (Tabellen, ENUMs, RLS, Storage)
    └── seed/                   Beispieldaten für lokale Entwicklung
```

## Bekannte Lücken / nächste Schritte

- **Service Worker für PWA** fehlt noch.
- **Google Calendar Sync** ist nicht angebunden — `calendar_source` als ENUM
  ist vorbereitet, aber es gibt noch keine Edge Function/OAuth-Flow dafür.
  Token-Refresh und Konflikt-Auflösung bei beidseitigen Änderungen brauchen
  einen eigenen Design-Pass.
- **Gerätefotos/Dokumente-Upload-UI** fehlt — die Datenbanktabellen
  (device_photos, device_documents) und Storage-Buckets existieren bereits,
  aber es gibt noch keine Upload-Komponente in der Geräte-Detailseite.
- **Eigener Vollbild-Packmodus** (mehrere Geräte nacheinander scannen ohne
  Navigation) ist im Kern über useUsbScannerInput schon möglich, aber als
  eigener UI-Flow noch nicht gebaut.
- **Tauri-Icons** fehlen (Platzhalter-Pfade in tauri.conf.json).
- Alle Phase-2/3-Features (Rechnungen, Mahnungen, Mini-Buchhaltung, Aufgaben,
  Wartungsintervalle, Schadensprotokoll, Website-Formular, Statistiken) sind
  nicht Teil dieses Builds.
