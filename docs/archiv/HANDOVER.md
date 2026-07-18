# Übergabe an eine neue Session — EventTech-Manager

> **Du bist neu hier und kennst das Projekt nicht.** Lies dieses Dokument zuerst ganz durch,
> verschaffe dir dann selbst einen Überblick über den Code (`README.md`, `WORKFLOW.md`,
> `DEPLOY.md`, `CLAUDE.md`), und **stelle Rückfragen**, bevor du mit der Umsetzung startest.
>
> **Reihenfolge:** (1) einarbeiten, (2) Rückfragen stellen, (3) den Abschnitt
> **„JETZT umsetzen: Website-Kontaktformular → System"** abarbeiten. Die „Backlog"-Punkte
> kommen später, nicht ungefragt anfangen.

---

## 1. Was ist das Projekt?

**EventTech-Manager** — Web-App für einen Eventtechnik-Verleih (Inventar, Jobs/Packlisten,
Kunden, Angebote, Kalender, Aufgaben). Deutschsprachig, Dark-Theme, mit Login & Rollen.
Funktionsüberblick: siehe `README.md`.

- **Monorepo (pnpm).** Web-App `apps/web` (`@eventtech/web`): Vite + React + TypeScript +
  TanStack Query + Tailwind. Backend `supabase/`.
- **„Das Backend (RLS) ist die Wahrheit."** Rechte per Postgres-RLS
  (`has_area()`/`can_edit_area()`/`is_admin()`, Muster in `supabase/migrations/0012_*`); die
  UI blendet nur zusätzlich aus. `anon` hat keine Tabellenrechte (Härtung `0030`).

### WICHTIG: seit Kurzem öffentlich deployt (zwei Umgebungen)
- **Lokal (Entwicklung):** selbst-gehostetes Supabase via Docker (`localhost:54321`).
- **Produktion (live):** Frontend auf **Cloudflare Pages** (`eventtech-web.pages.dev`, eigene
  Domain `manage.eventtechnik-fk.de`), Backend auf **Supabase Cloud**
  (Projekt-Ref `pcyhumjbkdtzgjwuvyal`, Region eu-central-1). Der Laptop ist für den Betrieb
  nicht mehr nötig.
- Das Frontend wählt das Backend automatisch über `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
  (lokal `apps/web/.env`, Cloud aus den Pages-Env-Variablen). **Service-Role-Key nur
  serverseitig** (Edge Functions), nie im Frontend.
- Details: `DEPLOY.md` (Einrichtung), `WORKFLOW.md` (Alltag), Memory `public-deployment.md`.

## 2. Arbeitsweise (verbindlich — auch in `CLAUDE.md`)

- **Nach jeder fertigen, verifizierten Teilaufgabe direkt auf `main` committen und pushen.**
  Kleine Commits, Trailer `Co-Authored-By: Claude <noreply@anthropic.com>`, deutsche
  Nachrichten. **Tipp:** in PowerShell-Here-Strings für `git commit -m` Umlaute/`"` meiden (ASCII).
- **Vor jedem Commit verifizieren** (nie roten Stand pushen):
  `cd apps/web` → `npx tsc --noEmit` → `npx eslint <dateien>` → `npx vite build`.
  - Vorbestehende ESLint-Warnung in `apps/web/src/hooks/useJobs.ts` (ungenutztes `jobId`) — ok.
- **Push deployt automatisch:** Frontend → Cloudflare Pages baut & deployt; DB-Migrationen →
  GitHub-Action `.github/workflows/db-migrate.yml` spielt sie in die Cloud (**sofern die 3
  GitHub-Secrets gesetzt sind** — `SUPABASE_PROJECT_REF`/`SUPABASE_DB_PASSWORD`/
  `SUPABASE_ACCESS_TOKEN`; sonst manuell `supabase db push`). **Vorher mit dem Nutzer klären,
  ob die Secrets schon gesetzt sind.**
- **Migrationen:** non-destruktiv, fortlaufend nummeriert. **Letzte vorhandene: `0030`** →
  nächste freie ist **`0031`**. Tracking-Tabelle hängt zurück → **NICHT** `supabase migration up`;
  lokal manuell anwenden:
  `docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/0031_*.sql`
  danach `notify pgrst, 'reload schema';`. In die Cloud via Push/Action bzw. `supabase db push`.
- **Neue Tabellen:** RLS an + Policies nach Muster `0012`, GRANTs an `authenticated, service_role`
  — **nicht** an `anon` (Härtung `0030`).
- **Edge Functions** deployen nicht automatisch beim Push: lokal erst nach
  `supabase stop && supabase start` aktiv; in die Cloud mit `supabase functions deploy <name>`.
  Standard-Secrets (`SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`) spritzt die Plattform ein.
- Projekt-Skill **`eventtech-dev`** für lokale Umgebung (Docker/Stack/Migrationen/Admin-Bootstrap).

## 3. Aktueller Stand (Branch `main`)

Zuletzt umgesetzt & gepusht (tsc/eslint/build grün):
- **Inventar:** Kaufpreis beim Anlegen, Lagerort verpflichtend (kein „Keiner" mehr);
  DGUV-V3-Elektroprüfung (letzte/nächste Prüfung + Fälligkeits-Erinnerung); Barcode-Scan
  springt direkt zum Gerät; Scan-Knopf mittig in der Mobil-Navigation.
- **Kunden:** bearbeiten (Dialog inkl. Adresse).
- **Angebote:** Firmenlogo hochladen (Admin) und im PDF-Briefkopf anzeigen.
- **Jobs:** Zeitplan-Foto an Programmpunkten; Anlage standardmäßig eintägig + Mini-Kalender
  (andere Jobs) bei Zeitraumwahl; **Papierkorb** (Soft-Delete, Wiederherstellen, endgültig
  löschen mit Warnung).
- **Deployment:** öffentlich live (Cloudflare Pages + Supabase Cloud), Auto-Deploy aus GitHub,
  `_redirects` (SPA), Härtung `0030` (anon ohne Rechte), `WORKFLOW.md`/`DEPLOY.md`.

**Noch NICHT umgesetzt:** „JETZT umsetzen" + „Backlog" unten.

---

## 4. JETZT umsetzen: Website-Kontaktformular → System

**Ziel des Nutzers:** Auf der Firmen-Website (gebaut mit **Lovable**) ein **Kontaktformular**,
dessen Einsendungen **automatisch im EventTech-Manager landen** — nicht umgekehrt (das System
wird nicht in die Website eingebettet). Der Nutzer will Web-Leads nicht mehr abtippen.

**Gute Nachricht durch den Cloud-Umzug:** Der früher offene Punkt „wie wird die Funktion
öffentlich erreichbar?" ist **gelöst** — Supabase-Cloud-Edge-Functions sind bereits öffentliche
HTTPS-Endpunkte (`https://pcyhumjbkdtzgjwuvyal.supabase.co/functions/v1/<name>`). **Kein
Tunnel/Tailscale mehr nötig.**

### 4.1 Datenbank — Migration `0031_website_leads.sql`
- Neue eigene Tabelle **`website_leads`** (bewusst NICHT direkt `customer_inquiries`, das braucht
  einen Pflicht-`customer_id` → würde Kunden-Dubletten/Zwang erzeugen). Rohdaten zur manuellen Sichtung.
- Felder (Vorschlag): `id uuid pk default gen_random_uuid()`, `name text`, `email text`,
  `phone text`, `company text`, `event_date date`, `budget_estimate numeric`, `message text`,
  `status text not null default 'neu' check (status in ('neu','bearbeitet','verworfen'))`,
  `created_at timestamptz not null default now()`.
- **RLS an.** SELECT/UPDATE/DELETE nur für berechtigte Innen-Nutzer (Muster `0012`: `has_area('kunden')`
  / `can_edit_area('kunden')`). **Kein INSERT-Recht für `anon`/`authenticated`** — Einsendungen
  kommen ausschließlich über die Edge Function (Service-Role, RLS-Bypass).
- GRANTs an `authenticated, service_role` (nicht `anon`). `notify pgrst`.
- Lokal per psql anwenden; in die Cloud via Push/Action bzw. `supabase db push`.

### 4.2 Edge Function `public-lead` (öffentlich, ohne Login)
- Neu `supabase/functions/public-lead/index.ts`, Muster wie `calendar-feed` (öffentlich):
  - In `supabase/config.toml` einen Block `[functions.public-lead]` mit `verify_jwt = false`.
  - **CORS** setzen (OPTIONS-Preflight beantworten; `Access-Control-Allow-Origin` = die
    Lovable-Domain, vorerst ggf. `*`).
  - Nur **POST** akzeptieren, JSON validieren (Pflicht: Name + (E-Mail oder Telefon); Felder trimmen,
    Längen begrenzen).
  - Einfacher **Spam-/Rate-Limit-Schutz**: Honeypot-Feld (z.B. verstecktes `website`-Feld → wenn
    befüllt, still 200 zurückgeben ohne Insert) und/oder simple IP-Drosselung.
  - Mit **Service-Role-Key** (`SUPABASE_SERVICE_ROLE_KEY`, von der Plattform injiziert) in
    `website_leads` schreiben (RLS-Bypass). Saubere Fehler/Status-Codes.
- Lokal testen: `supabase stop && supabase start`, dann `curl -X POST .../functions/v1/public-lead`.
- In die Cloud: `supabase functions deploy public-lead`.

### 4.3 Frontend — Tab „Website-Anfragen" auf der Kunden-Seite
- `apps/web/src/pages/CustomersPage.tsx`: dritter Tab/Ansicht **„Website-Anfragen"** (neben
  Kundenliste + Anfragen-Pipeline). Liste der `website_leads` (neue zuerst), je Eintrag:
  **„Zu Kunde machen"** (legt `customers`-Zeile aus den Lead-Daten an, optional gleich eine
  `customer_inquiries`-Karte; Lead-Status → `bearbeitet`) und **„Verwerfen"** (Status `verworfen`).
- Neuer Hook `apps/web/src/hooks/useWebsiteLeads.ts` (Liste/Status-Update/„zu Kunde machen"),
  Typ in `types/database.ts`. Bestätigungen/Meldungen über vorhandene `useConfirm`/`useToast`.
- Badge mit Anzahl „neuer" Leads am Tab ist ein netter Zusatz.

### 4.4 Lovable-Website (durch den Nutzer)
- Du lieferst dem Nutzer ein **fetch/POST-Snippet** für das Lovable-Formular, das gegen
  `https://pcyhumjbkdtzgjwuvyal.supabase.co/functions/v1/public-lead` postet (JSON, Honeypot-Feld
  inklusive). Mit `verify_jwt = false` ist **kein** Auth-Header nötig.
- Mit dem Nutzer klären: exakte Formularfelder und die **CORS-Origin** (Domain der Lovable-Seite).

**Verifikation:** Migration `0031` lokal + Cloud drin; Function lokal (curl) und nach Deploy in der
Cloud erreichbar; Test-POST landet als Lead; Tab zeigt ihn; „Zu Kunde machen"/„Verwerfen" wirken;
RLS getestet (anon kann NICHT lesen/schreiben). tsc/eslint/build grün, pro Teilstück commit+push.

---

## 5. Backlog — später, nicht ungefragt starten
- **Rechnungsstellung** — größter offener Baustein (Rechnung aus Job/Angebot, Status-Workflow,
  PDF). Dashboard verweist bereits darauf.
- **DB-Backups** der Cloud-DB (regelmäßiger `pg_dump`).
- **Globale Suche + Änderungsprotokoll** — größeres Feature.
- **Automatisierte Tests** (Smoke: Login, Packliste, Angebot) fehlen komplett.
- **Öffentlicher Kalender-Feed** für Google/Apple (Function `calendar-feed` existiert; mit der
  Cloud-URL jetzt direkt nutzbar — Abo-Link/`VITE_CALENDAR_FEED_BASE_URL` prüfen).
- Kleinigkeit: ESLint-Warnung `useJobs.ts` (`jobId`).

## 6. Wichtige Referenzen
- **Dokumente:** `README.md`, `WORKFLOW.md` (Feature-Ablauf), `DEPLOY.md` (Cloud-Einrichtung),
  `CLAUDE.md` (Regeln), dieses `HANDOVER.md`.
- **Memory:** `C:\Users\lnu\.claude\projects\C--Users-lnu-Documents-eventtech-manager\memory\`
  — u.a. `public-deployment.md`, `website-lead-form.md`, `service-role-grants.md`,
  `edge-function-restart.md`, `calendar-remote-access.md` (Index in `MEMORY.md`).
- **RLS-Muster:** `supabase/migrations/0012_auth_roles_and_access.sql`. **Öffentliche Function als
  Vorbild:** `supabase/functions/calendar-feed/`.
- **Cloud:** Supabase-Ref `pcyhumjbkdtzgjwuvyal`; Live-URL `manage.eventtechnik-fk.de` /
  `eventtech-web.pages.dev`. **Lokal:** DB-Container `supabase_db_eventtech-manager`,
  `pnpm dev`, Skill `eventtech-dev`.
