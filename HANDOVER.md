# Übergabe an eine neue Session — EventTech-Manager

> **Du bist neu hier und kennst das Projekt nicht.** Lies dieses Dokument zuerst ganz durch,
> verschaffe dir dann selbst einen Überblick über den Code, und **stelle Rückfragen**,
> bevor du mit der Umsetzung startest. Dieses Dokument ist „der Plan", auf den sich der Nutzer bezieht
> (Kopie liegt auch unter `C:\Users\lnu\.claude\plans\cozy-sprouting-coral.md`).
>
> **Reihenfolge:** (1) einarbeiten, (2) Rückfragen stellen, (3) den Abschnitt
> **„JETZT umsetzen: Release-Vorbereitung"** abarbeiten. Die „Backlog"-Punkte kommen
> irgendwann später, in unbekannter Zeit — nicht ungefragt anfangen.

---

## 1. Was ist das Projekt?

**EventTech-Manager** — interne Web-App für einen Eventtechnik-Verleih (Inventar, Jobs/Packlisten,
Kunden, Angebote, Kalender, Aufgaben). Deutschsprachig, Dark-Theme.

- **Monorepo (pnpm).** Web-App unter `apps/web` (`@eventtech/web`): Vite + React + TypeScript +
  TanStack Query + Tailwind. Backend unter `supabase/` (selbst-gehostetes Supabase via CLI in Docker).
- **Grundsatz: „Backend (RLS) ist die Wahrheit".** Rechte werden in Postgres-RLS-Policies erzwungen
  (`has_area(...)`/`can_edit_area(...)`/`is_admin()`, siehe `supabase/migrations/0012_...sql`); die UI
  blendet nur zusätzlich aus.
- **Sicherheits-Kontext (wichtig):** Der lokale Stack nutzt **Default-/Shared-JWT-Secrets** →
  das ganze Backend darf **niemals öffentlich** exponiert werden. Fernzugriff läuft daher über
  **Tailscale-VPN** (PC `lnu06`, Tailscale-IP `100.84.122.27`, MagicDNS `lnu06.tail41b62a.ts.net`;
  Handy im selben Tailnet). Service-Role-Key nur serverseitig (Edge Functions).

## 2. Arbeitsweise (verbindlich — steht auch in `CLAUDE.md` im Repo-Root)

- **Nach jeder fertigen, verifizierten Teilaufgabe direkt auf `main` committen und pushen.** Kleine,
  in sich abgeschlossene Commits. Commit-Trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
  Commit-Nachrichten auf Deutsch, knapp (was + warum). **Tipp:** Umlaute/Anführungszeichen in
  PowerShell-Here-Strings für `git commit -m` vermeiden (ASCII nutzen) — doppelte `"..."` haben
  Commits zerschossen.
- **Vor jedem Commit verifizieren** (nie roten Stand pushen):
  `cd apps/web` dann `npx tsc --noEmit`, `npx eslint <geänderte Dateien>`, `npx vite build`.
  - Es gibt **eine vorbestehende** ESLint-Warnung in `apps/web/src/hooks/useJobs.ts:732`
    (ungenutztes `jobId`) — kein Fehler, nicht von neuen Änderungen; darf bleiben (oder bei
    Gelegenheit aufräumen).
- **Migrationen:** non-destruktiv und fortlaufend nummeriert in `supabase/migrations/`. Die
  Migrations-Tracking-Tabelle hängt zurück (nur bis ~0015 getrackt) → **NICHT** `supabase migration up`
  nutzen, sondern **manuell** auf die laufende DB anwenden:
  `docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/<datei>.sql`
  Nach DDL `notify pgrst, 'reload schema';` absetzen. Neueste vorhandene Migration: `0024_offers_job_link.sql`.
- **Neue Tabellen brauchen explizite GRANTs** (`grant ... to authenticated, service_role`) — es gibt
  kein Auto-Expose, sonst stille leere Daten / 403. RLS-Policies am Bereichsmuster aus `0012` orientieren.
- **Neue/geänderte Edge Functions** werden erst nach `supabase stop && supabase start` aktiv.
- Es gibt einen Projekt-Skill **`eventtech-dev`** (lokale Umgebung hochfahren/reparieren, Migrationen
  anwenden, Admin bootstrappen) — bei Umgebungs-/„geht nicht"-Problemen nutzen.

## 3. Aktueller Stand (Branch `main`)

Zuletzt umgesetzt und gepusht (jeweils tsc/eslint/build grün):
- Großes Inventar-Update (Lagerorte als Tabelle + Pillen, abgeleitete Verfügbarkeit
  `available = Bestand − defekt − in aktiven Jobs`, Geräte-/Job-Historie, Packlisten-Workflow
  Packen/Rückgabe mit Scanner, Geräte-Bearbeitungsmodus, Pillen statt Dropdowns).
- Überblick: „Nächster Job" (mit Zeitplan) statt „Heute"; Logo als Startseiten-Link; Mobile-Header.
- Inventar: Bestand immer „N×"; Geräte-Verlauf mit Filter (Jobs/Lagerort/Andere).
- Jobs: „Vergangen"-Ordner (komplett vergangene Jobs); Packliste nach Lagerort→Kategorie sortiert
  (mit Lagerort-Überschriften); Set-Überbuchung behoben; Set-Abwahl + klare Auswahl-Markierung;
  Rückgabe als Liste mit Pflicht-Lagerort.
- Angebote: „Als Angebot" aus der Packliste (vorbefüllter Dialog, Mietdauer = Job-Dauer); Angebote
  werden am Job gespeichert und auf der Job-Seite angezeigt (Migration `0024`, `offers.job_id`).

**Noch NICHT umgesetzt:** alles unter „JETZT umsetzen" und „Backlog" unten.

---

## 4. JETZT umsetzen: Release-Vorbereitung

**Kontext:** Dieser Stand soll die **erste Release-Version** werden. Vier Punkte sind dafür mit dem
Nutzer beschlossen. RLS ist bereits sauber (0012 reaktiviert RLS+Policies für alle Domänentabellen;
`0006_disable_rls_local_dev.sql` war nur lokaler No-Login-Stand und wird durch 0012 ersetzt) — **kein
Blocker.** A–D je als eigener Commit.

### A) Angebote bearbeiten + Status ändern
Aktuell kann man Angebote nur anlegen/löschen/als PDF — **nicht bearbeiten**, und den **Status nicht
ändern** (kein UI-Element dafür).
- `apps/web/src/hooks/useOffers.ts`: neuer `useUpdateOffer` — aktualisiert Angebotsfelder (title,
  customer_id, inquiry_id, job_id, valid_until, tax_rate, notes, **status**) und **ersetzt die
  Positionen** (`offer_items` des Angebots löschen + neu einfügen, Muster wie `useCreateOffer`).
  Invalidiert `OFFERS_KEY`, `[…,id]`, `by-customer`, `by-job`.
- `apps/web/src/components/offers/CreateOfferDialog.tsx`: optionales Prop `editOffer?: Offer`. Im
  `open`-Effekt bei gesetztem `editOffer` alle Felder + Positionen aus `editOffer.items` vorbefüllen,
  Titel „Angebot bearbeiten", zusätzliches **Status-Feld** (`Select` mit `OFFER_STATUS_OPTIONS`,
  aus `types/database.ts`), Submit → `useUpdateOffer`; sonst unverändert anlegen.
- `apps/web/src/pages/OffersPage.tsx`: Bearbeiten-Button (Pencil, nur `mayEdit`) pro Zeile öffnet den
  Dialog mit `editOffer`. `useOffers` lädt `items` bereits mit.

### B) Echte Firmendaten als Einstellungsseite (Admin)
Die Angebots-PDFs tragen **Platzhalter** (Musterbank/IBAN/Adresse in
`apps/web/src/lib/companyInfo.ts`, `COMPANY_INFO`) — dürfen so nicht an Kunden.
- Migration `0025_company_settings.sql`: Einzelzeilen-Tabelle `company_settings`
  (`id boolean primary key default true check (id)`, `name`, `address_lines text[]`, `phone`, `email`,
  `website`, `tax_id`, `bank_line`, `payment_terms`, `updated_at`). **RLS:** select = `authenticated`
  (PDF braucht es), insert/update = `is_admin()`. **GRANTs** an authenticated + service_role. Seed-Zeile
  mit den heutigen `COMPANY_INFO`-Werten. `notify pgrst`. Manuell via psql anwenden.
- `apps/web/src/hooks/useCompanySettings.ts` (neu): `useCompanySettings()` (read),
  `useUpdateCompanySettings()` (admin), `fetchCompanySettings()` (für die PDF-Erzeugung).
- `apps/web/src/components/offers/OfferPdfDocument.tsx`: `OfferPdfDocument`/`downloadOfferPdf`
  bekommen `company: CompanyInfo` (Default = `COMPANY_INFO` als Fallback). `downloadOfferPdf` lädt vor
  dem Rendern `fetchCompanySettings()` und reicht es durch — **Aufrufer (OffersPage, CustomerDetailPage,
  JobDetailPage) bleiben unverändert.** `lib/companyInfo.ts` bleibt als Typ + Fallback.
- `apps/web/src/pages/AdminPage.tsx`: Abschnitt „Firmendaten" (nur Admin) zum Bearbeiten.

### C) Code-Splitting (schnellerer Erststart)
Aktuell **ein** ~3,4-MB-JS-Bundle → langsamer Erststart, v.a. mobil/über Tailscale.
- `apps/web/src/router.tsx`: Seiten-Komponenten auf `React.lazy(() => import(...))` (Guards/AppShell
  eager). In `apps/web/src/components/layout/AppShell.tsx` den `<Outlet/>` in
  `<Suspense fallback={<LoadingState .../>}>` einhüllen; Login-Route ebenso.
- Schwere PDF-Lib `@react-pdf/renderer` aus dem Initial-Bundle halten: `downloadOfferPdf` das
  PDF-Modul **dynamisch** importieren lassen (neue schlanke `apps/web/src/lib/offerPdf.ts`, die intern
  `OfferPdfDocument` per `await import(...)` lädt; Aufrufer importieren `downloadOfferPdf` aus dieser
  Datei). So zieht react-pdf erst beim ersten PDF.
- `apps/web/vite.config.ts`: optional `build.chunkSizeWarningLimit` anheben. Ziel: kein
  3,4-MB-Single-Chunk mehr; react-pdf nicht im Initial-Chunk.

### D) Einheitliche Dialoge & Toasts statt `confirm()/alert()`
21 native `confirm()/alert()` in 13 Dateien — sehen überall anders aus, passen nicht ins Dark-Theme,
werden in mancher mobilen PWA **unterdrückt** (dann lässt sich z.B. nichts löschen).
- Neu `apps/web/src/components/ui/Toast.tsx`: `ToastProvider` + `useToast()`
  (`toast.success/error/info`), fixierter Container; in `App.tsx` mounten.
- Neu `apps/web/src/components/ui/ConfirmDialog.tsx`: `ConfirmProvider` + `useConfirm()` (Promise-basiert,
  über die vorhandene `components/ui/Dialog.tsx`); in `App.tsx` mounten.
- Alle 21 Stellen ersetzen (u.a. `AdminPage` [6, inkl. `prompt()` für Passwort-Reset → kleiner
  Eingabedialog], `OffersPage` [2], `DeviceDetailPage` [2], `ManageSetsDialog` [2], sowie je 1 in
  CustomerDetailPage, JobDetailPage, TasksPage, CalendarEntryDialog, CalendarSubscribeDialog,
  JobTasksSection, ManageCategoriesDialog, TaskEditPanel, ManageLocationsDialog): Löschen → `useConfirm`,
  Erfolg/Fehler → `useToast`.

**Verifikation Release-Vorbereitung:** pro A–D tsc+eslint+build grün → commit+push. Build hat mehrere
Chunks (react-pdf nicht initial). Migration 0025 angewandt; select als authenticated, schreiben nur
Admin. Manuell: Angebot bearbeiten (Felder+Positionen+Status) speichert; Admin ändert Firmendaten →
neues PDF zeigt echte Daten; Seiten laden mit Suspense-Fallback; Löschen per In-App-Dialog, Meldungen
als Toast; auf Mobile/PWA funktioniert Löschen zuverlässig.

---

## 5. Backlog — irgendwann, in unbekannter Zeit (nicht ungefragt starten)

### Website-Kontaktformular → System (durchdacht, noch nicht umgesetzt)
Auf der Firmen-Website (gebaut mit **Lovable**) ein Kontaktformular, das Anfragen **direkt in den
EventTech-Manager** schickt — nicht umgekehrt (kein Einbetten des Systems in die Website). Voller
Plan + Begründung in der Memory-Datei
`C:\Users\lnu\.claude\projects\C--Users-lnu-Documents-eventtech-manager\memory\website-lead-form.md`.
Kern:
- Neue Tabelle `website_leads` (nicht direkt `customer_inquiries`, das braucht Pflicht-`customer_id`);
  Einsendungen landen als Rohdaten zur manuellen Sichtung (keine Kunden-Dubletten).
- Felder: Name, E-Mail, Telefon, Firma, Event-Datum, Budget-Schätzung, Nachricht.
- Technik 1:1 wie der bestehende Kalender-Feed: neue Edge Function `public-lead` mit
  `verify_jwt = false`, schreibt per Service-Role-Key (RLS-Bypass) — sonst wird nichts exponiert.
  CORS + einfacher Rate-Limit nötig (Route ohne Login).
- UI: dritter Tab „Website-Anfragen" auf `CustomersPage.tsx` mit „Zu Kunde machen" / „Verwerfen".
- **Bewusst offen:** wie die Funktion öffentlich erreichbar wird (Cloudflare-Tunnel-Pfad erweitern
  wie beim Kalender-Feed, oder andere Lösung). Migration wäre die nächste freie Nummer (Liste vorher prüfen).

### Weitere offene Punkte
- **Deployment-Härtung (kritisch vor echtem Produktivbetrieb, Ops):** eigene JWT-Secrets + anon/service-
  Keys statt der Default-/Shared-Secrets generieren; Service-Role nur serverseitig; Backend nicht
  öffentlich exponieren (Tailscale bleibt). Siehe Memory `calendar-remote-access.md`.
- **Öffentlicher Kalender-Feed für Google/Apple** über Cloudflare named Tunnel — technisch getestet,
  offen ist nur die Domain-Entscheidung. Details in Memory `calendar-remote-access.md` + Ordner `tunnel/`.
- **DB-Backups** für die selbst-gehostete DB (regelmäßiger `pg_dump`).
- **Globale Suche + Änderungsprotokoll** — lange geplant, größeres Feature.
- **Automatisierte Tests** fehlen komplett — zumindest Smoke-Tests (Login, Packliste, Angebot).
- **Rechnungsstellung** — das Dashboard verweist bereits darauf als künftiges Feature.
- Kleinigkeiten: Angebot-Feld `event_date` wird im Dialog nicht gepflegt; ESLint-Warnung
  `useJobs.ts:732`.

---

## 6. Wichtige Referenzen
- **Dieses Handover / der Plan:** `HANDOVER.md` (Repo-Root) bzw.
  `C:\Users\lnu\.claude\plans\cozy-sprouting-coral.md`.
- **Projekt-Regeln:** `CLAUDE.md` im Repo-Root.
- **Memory (projektübergreifendes Wissen):**
  `C:\Users\lnu\.claude\projects\C--Users-lnu-Documents-eventtech-manager\memory\` — u.a.
  `website-lead-form.md`, `calendar-remote-access.md`, `service-role-grants.md`, `edge-function-restart.md`
  (Index in `MEMORY.md`).
- **RLS-Muster:** `supabase/migrations/0012_auth_roles_and_access.sql`.
- **DB-Container:** `supabase_db_eventtech-manager`. **Dev:** `pnpm dev`. **Skill:** `eventtech-dev`.
