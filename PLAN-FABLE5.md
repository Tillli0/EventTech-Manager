# Plan: Große Features für Fable 5 — EventTech-Manager

> **Stand 2026-07-02:** Block 4 (Test-Fundament, ohne Playwright-E2E), Block 2
> (Verfügbarkeits-Engine) und Block 1 (Rechnungswesen, ohne Mahnwesen/Dashboard-Kachel)
> sind **umgesetzt** — Details in `IDEAS.md` unter „Kürzlich umgesetzt". Offen aus dem
> Plan: Block 3 (Suche + Audit-Log), Block 5 (Design-System + Inventar-Redesign) sowie
> die genannten Rest-Stücke.

> Zweck dieser Datei: Ein kuratierter Fahrplan der **wenigen wirklich großen** Bausteine,
> die sich lohnen, mit dem stärksten Modell (Fable 5) umzusetzen. Bewusst **keine** Quick
> Wins, keine Copy-/UI-Politur, keine ESLint-Aufräumer — die laufen im normalen
> Weiterentwicklungs-Modus (siehe `IDEAS.md` / `CLAUDE.md`).
>
> **Was „lohnt sich für Fable 5" bedeutet:** bereichsübergreifend (Schema + RLS + Edge
> Function + Frontend + PDF), rechtlich/sicherheitskritisch, algorithmisch kniffelig oder
> mit Nebenläufigkeits-/Korrektheitsfallen. Genau die Dinge, bei denen ein subtiler Fehler
> teuer wird.
>
> **Reihenfolge = Empfehlung.** Jeder Block ist eigenständig lieferbar. Vor jedem Block
> holt Fable 5 sich die Freigabe (alle hier sind „Freigabe nötig", nicht „Auto").

---

## Leitplanken (gelten für jeden Block)

- **Backend ist die Wahrheit:** jede neue Tabelle bekommt RLS + `has_area`/`can_edit_area`-
  Policies nach dem Muster aus `0012_auth_roles_and_access.sql` — **plus** explizite
  `grant … to authenticated, service_role` (nie `anon`; `0030` hält `anon` leer).
- **Migrationen** non-destruktiv, fortlaufend nummeriert ab `0036…`, lokal via
  `docker exec … psql` anwenden; Cloud zieht automatisch über den `db-migrate`-Action nach.
- **Service-Role nur serverseitig** (Edge Functions). Nie im Frontend.
- **Verifizieren vor Commit:** `tsc --noEmit` + ESLint + Build grün, kleine Commits pro
  Teilschritt, direkt auf `main` pushen.

---

## 1) Rechnungswesen (Flaggschiff) · L · ★★★

**Warum Fable 5:** Rechtlich heikel (GoBD/§14 UStG-Pflichtangaben), **lückenlose**
fortlaufende Nummerierung unter Nebenläufigkeit, Teilzahlungen/Mahnstufen als
Status-Automat, PDF mit korrekter Steuerausweisung. Fehler hier sind nicht kosmetisch,
sondern buchhalterisch/rechtlich relevant.

**Aufsetzpunkt im Code:** `offers`/`offer_items` (`0011`, `0024`) sind das direkte Vorbild
— Rechnung ist im Kern „Angebot mit Zahlungslogik + fester Nummer". `useOffers.ts` und
`OffersPage.tsx` als Blaupause für Hooks/Seite. PDF-Stack (`react-pdf`) ist schon im Bundle.

**Scope:**
- **Schema** (`00xx_invoices.sql`): `invoices` (Nummer, Kunde, Job/Angebot-Link, Status
  `entwurf|gestellt|teilbezahlt|bezahlt|storniert|ueberfaellig`, Rechnungs-/Fälligkeitsdatum,
  Steuersatz, Zahlungsziel, Snapshot der Firmen-/Kundenadresse), `invoice_items` (wie
  `offer_items`, Positionen als Snapshot), `invoice_payments` (Teilzahlungen: Betrag, Datum,
  Art). Fortlaufende Nummer über **eigene Sequenz + Jahres-Präfix** in einer
  `SECURITY DEFINER`-Funktion mit `pg_advisory_xact_lock`, damit unter Parallelzugriff
  keine Lücke/Dublette entsteht (Pflicht!).
- **RLS:** neuer Bereich `rechnungen` **oder** an `angebote` andocken — Entscheidung mit
  Nutzer. `user_area_access`/`app_area`-Enum entsprechend erweitern.
- **Konvertierung:** „Angebot → Rechnung" und „Job → Rechnung" (Positionen aus Packliste/
  Angebot übernehmen). Storno erzeugt **Storno-Rechnung**, kein Hard-Delete (GoBD).
- **PDF:** Pflichtangaben, Steuerausweis, Zahlungshinweis, Firmenlogo aus
  `company_settings`. Wiederholt druckbar (Snapshot bleibt stabil).
- **Mahnwesen (Stufe 2):** Fälligkeit überschritten → Status `ueberfaellig`; optional
  Mahnstufen + E-Mail über Resend (wie `public-lead` es schon nutzt).
- **Dashboard:** offene/überfällige Summe (der Dashboard-Platzhalter existiert bereits).

**Risiken/Fallen:** Nummernlücken bei Rollback/Parallelität; Steuer-Rundung pro Position vs.
Gesamt; Storno-Semantik; Adress-Snapshot vs. spätere Stammdatenänderung.

**Fertig, wenn:** Rechnung aus Angebot/Job erzeugbar, lückenlos nummeriert, als PDF mit
Pflichtangaben druckbar, Teilzahlung + „bezahlt" + Storno funktionieren, RLS greift.

---

## 2) Verfügbarkeits- & Doppelbuchungs-Engine · L · ★★★

**Warum Fable 5:** Das ist das **Herzstück eines Vermietsystems** und algorithmisch das
Fehleranfälligste: Intervall-Überlappung über Job-Zeiträume, Mengen-Verrechnung gegen
`stock_quantity`, **Set-Auflösung** (ein Set bindet seine Einzelgeräte), Status-Gating
(welche Job-Status blockieren Bestand). Subtile Off-by-one-/Randfehler kosten reale
Doppelbuchungen.

**Aufsetzpunkt:** `0022_device_availability.sql`, `useDevices.ts`/`useJobs.ts` (die
Verfügbarkeits-Abfragen berücksichtigen schon die neuen Zwischenstatus), `PacklistSection.tsx`,
`device_sets`/`device_set_items`.

**Scope:**
- **Kernfunktion** (SQL, `SECURITY DEFINER` oder View): „Wie viel von Gerät X ist im
  Zeitraum [a,b] bereits gebunden?" — summiert `packlist_items` aller **überlappenden**
  Jobs in bestandsbindenden Status (`planung…rueckgabe`), löst Sets in ihre Einzelteile auf,
  vergleicht gegen `stock_quantity`.
- **Konflikt-Warnung beim Packen:** Beim Hinzufügen/Erhöhen einer Position in der Packliste
  Live-Prüfung → Badge „nur N von M frei im Zeitraum" + Liste der kollidierenden Jobs.
- **Kalender-Overlay:** pro Tag Auslastungsindikator; Klick zeigt, welche Geräte knapp sind.
- **Optional harte Sperre** (mit Nutzer klären): Überbuchung verhindern vs. nur warnen.

**Risiken/Fallen:** halboffene vs. geschlossene Intervalle (tagesbasierte Jobs!),
Set-in-Set, gelöschte Geräte in alten Packlisten, Performance bei vielen Jobs (Index auf
Job-Zeitraum + `packlist_items(device_id)`).

**Fertig, wenn:** Packliste zeigt korrekte Rest-Verfügbarkeit im Job-Zeitraum inkl.
Set-Auflösung, Kollisionen werden benannt, Kalender zeigt Engpässe.

---

## 3) Globale Suche + Änderungsprotokoll (Audit-Log) · L · ★★★

**Warum Fable 5:** Zwei bereichsübergreifende Infrastruktur-Themen in einem: (a) projektweite
Suche über Geräte/Jobs/Kunden/Angebote/Aufgaben mit sinnvollem Ranking, (b) ein Audit-Log,
das per Trigger an **vielen** Tabellen sauber, DSGVO-bewusst und performant mitschreibt, ohne
die App auszubremsen. Beides muss RLS-konform bleiben (Suche darf nur zeigen, was der Nutzer
sehen darf).

**Scope:**
- **Suche:** Postgres Full-Text (`tsvector`, generierte Spalte + GIN-Index) **oder** `pg_trgm`
  für Tippfehler-Toleranz. Eine `search`-RPC, die pro Entität RLS respektiert. Frontend:
  globales Suchfeld im Header (⌘K-Palette), gruppierte Treffer, Tastatur-Navigation.
- **Audit-Log:** Tabelle `audit_log` (Tabelle, Zeilen-ID, Aktion, Diff als JSONB, `auth.uid()`,
  Zeitpunkt). Generischer Trigger, per Schleife an die Domänentabellen gehängt (Muster wie die
  RLS-Schleife in `0012`). Anzeige: „Verlauf"-Tab je Datensatz + globale Verwaltungs-Ansicht.
  RLS: nur Admin/Verwaltung sieht das volle Log.

**Risiken/Fallen:** Trigger-Overhead bei Massen-Updates; JSONB-Diff groß/rauschig;
Such-Index-Pflege; RLS in der Such-RPC nicht aushebeln.

**Fertig, wenn:** ⌘K findet Datensätze über alle Bereiche (RLS-gefiltert); jede Änderung an
Kern-Tabellen landet nachvollziehbar (wer/wann/was) im Log.

---

## 4) Automatisiertes Test-Fundament · M–L · ★★

**Warum Fable 5:** Von **null** eine tragfähige Test-Architektur aufsetzen (Unit + E2E +
Seed + CI) ist eine Architektur-Entscheidung, kein Tippen. Gerade weil danach jede der obigen
Korrektheits-lastigen Features (Nummernkreis, Verfügbarkeit) durch Tests abgesichert werden
sollte, ist das ein Multiplikator.

**Scope:**
- **Vitest** für Hooks/Logik (Verfügbarkeitsrechnung, Nummernkreis, Preis-/Steuer-Summen).
- **Playwright** Smoke-E2E: Login → Job anlegen → Packliste → Angebot/Rechnung → Lead-Annahme.
- **Seed-Skript** für einen reproduzierbaren Test-Datenstand (lokale Docker-DB).
- **CI:** GitHub-Action, die bei PR/Push `tsc` + ESLint + Build + Tests fährt.

**Fertig, wenn:** `pnpm test` grün, ein E2E-Happy-Path läuft, CI blockt rote Stände.

---

## 5) Design-System vollenden + Inventar-Redesign · M · ★★

**Warum Fable 5:** Das Redesign ist konzeptionell schon abgestimmt (dunkles Premium-Theme,
Indigo), aber die **Zentralisierung der Basis-Komponenten** (Button/Card/Dialog/Tabs/Badge/
Input) ist ein systematischer, App-weiter Refactor mit vielen Berührungspunkten — genau da
hilft ein starkes Modell, Konsistenz ohne Regressionen zu halten.

**Scope:**
- Basis-Komponenten vereinheitlichen und alte Ad-hoc-Stellen darauf ziehen.
- **Inventar-Redesign** (bereits entschieden, siehe `IDEAS.md`): Geräte als **Liste**
  (Variante A), Geräte-Sets als **Foto-/Icon-Grid** (Variante B). Direkt so umsetzen, nicht
  neu diskutieren.
- Restseiten nachziehen: Kalender, Angebote, Aufgaben.

**Fertig, wenn:** Eine Komponenten-Quelle, Inventar in A/B-Aufteilung, einheitliches Look&Feel.

---

## Nicht hier, aber vorgemerkt (kleiner / abhängig von Nutzer-Infra)

- **DB-Backups automatisch + Button** (`M`): braucht vom Nutzer einen GitHub-PAT-Secret
  (`GH_DISPATCH_TOKEN`); Architektur steht in `IDEAS.md`. Kein Fable-5-Fall, sobald das Secret
  da ist — eher solide Fleißarbeit.
- **Cloudflare-Turnstile-Captcha**, **Code-Splitting-Feintuning**: normale Weiterentwicklung.

---

## Empfohlene Reihenfolge & Begründung

1. **Test-Fundament (4)** zuerst light aufsetzen → sichert alles Folgende ab.
2. **Verfügbarkeits-Engine (2)** → höchster fachlicher Kernnutzen, bremst sonst jede Skalierung.
3. **Rechnungswesen (1)** → größter Geschäftswert, baut auf Angeboten auf.
4. **Suche + Audit (3)** → Reife/Nachvollziehbarkeit, wenn Datenmenge wächst.
5. **Design/Inventar (5)** → parallel/als Auflockerung zwischendurch möglich.
