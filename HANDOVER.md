# Übergabe an eine neue Session — EventTech-Manager

> Stand: **2026-07-19**, geschrieben am Ende einer langen Session (v1 absichern +
> UI-Neuschnitt gestartet). **Lies zuerst diese Datei ganz durch**, dann bei Bedarf
> `CLAUDE.md` → `IDEAS.md` → das aktive `PLAN-*.md`. Diese Datei ist eine Momentaufnahme,
> **kein** dauerhaft gepflegtes Dokument — nach dem Einlesen kannst du sie ignorieren; die
> Wahrheit steht in `IDEAS.md`/`ROADMAP.md`/den `PLAN-*.md`.

---

## 1. Wo wir stehen — in einem Satz

**v1 ist abgesichert (Teil A komplett), der UI-Neuschnitt läuft** — helles Design ist live
(U1–U3 Kern erledigt), **eine offene Baustelle**: der E2E-Test in der CI ist weiterhin rot.

## 2. Was JETZT als Nächstes zu tun ist

**Der E2E-CI-Job.** Fünf Fixes sind bereits gepusht (Testnutzer über die Auth-API statt SQL,
Rechte über die ID statt E-Mail zuordnen, Profil-Upsert statt Trigger vertrauen,
Wartezeit auf `auth.users`, `ANON`-Variable neu ermitteln — jeder Schritt startet eine
frische Shell). **Der letzte Fehlertext von Till** (Lauf #46) zeigt: das komplette
Setup ist jetzt grün (Login, Rechte-Check bestehen), **nur der Test selbst schlägt fehl**.

→ **Nächster Schritt:** Till bittet, den Fehlertext aus dem Schritt „E2E-Tests" in
**Lauf #46 oder neuer** zu kopieren
(github.com/Tillli0/EventTech-Manager/actions/workflows/ci.yml). Der Test
(`e2e/job-flow.spec.ts`) meldet inzwischen selbst die Ursache (App-Fehlermeldung, ob der
Dialog noch offen war, abgelehnte Schreibzugriffe) — sollte reichen, um es final zu lösen.

**Falls das zu lange dauert:** Alternative ist, den `e2e`-Job aus `ci.yml` zu entfernen.
Das lokale Netz (`pnpm --filter @eventtech/web e2e`, 15 Tests, ~30s) funktioniert
nachweislich und hat bereits zweimal echte Fehler gefangen — der CI-Lauf ist zusätzlich,
nicht essenziell. Till wurde diese Option bereits angeboten, hat sich noch nicht
entschieden.

## 3. Was diese Session erledigt hat (mit Beweis)

### Teil A — v1 absichern (`PLAN-V1-ABSICHERN.md`, komplett ✅)
- **A4:** Backup-Falle „grün ≠ gesichert" in `DEPLOY.md` dokumentiert + 22 Tests für
  `csv.ts`/`datetime.ts`.
- **A1:** Restore real durchgespielt (echter Cloud-Dump). **Wichtigster Fund:** der
  ursprünglich dokumentierte Restore-Weg war falsch — Ziel muss ein **frisches
  Supabase-Projekt** sein, keine nackte DB (Plattform-Schemas `auth`/`extensions`/`vault`
  werden vorausgesetzt). Korrigiert in `DEPLOY.md`.
- **A2:** Storage-Dateien jetzt im automatischen Backup (`.github/workflows/db-backup.yml`).
  **Belegt:** nächtlicher Lauf hat am 19.07. 06:06 tatsächlich ein zweites Artefakt
  `storage-backup-…` erzeugt.
- **A3:** E2E-Netz mit Playwright, 15 Tests, Mutationsprobe bestanden (eine absichtlich
  kaputte Seite wurde korrekt rot).

### UI-Neuschnitt (`PLAN-UI-NEUSCHNITT.md`, U1–U3-Kern ✅, läuft weiter)
- **U1:** Mockup `docs/mockups/konzept-gesamt.html` — Navigation, drei Rollen
  (Till/Verwaltung/Freelancer), Job-Abschnitte, Dokumente-Ordner.
- **U2:** Theme-Fundament. App ist jetzt **hell** (Creme = Standard), umschaltbar auf
  Weiß+Indigo/Dunkel im Konto-Dialog. Alle Farben laufen über CSS-Variablen
  (`src/index.css`, `tailwind.config.js`). **Wichtigster Fund:** alle zwölf bisherigen
  Statusfarben waren auf hellem Grund unlesbar (1,87:1–4,23:1 statt nötiger 4,5:1) —
  nachgeschärft und gemessen. Vier verstreute Farbtabellen zu **einer** Registry
  (`lib/statusTone.ts`) zusammengeführt.
- **U3 (Kern):** Navigation in drei Gruppen (Arbeit/Kaufmännisch/Ablage, `lib/nav.ts`
  `NAV_GROUPS`) — erledigt zugleich **E8** aus `PLAN-NEUAUSRICHTUNG.md`. Startseite mit
  **„Nächster Einsatz"**-Hero (`components/dashboard/NextJobHero.tsx`) statt Firmenübersicht;
  rollen-adaptiv. „Offene Rechnungen" ersetzt „Geräte verfügbar" (nur mit `angebote`-Recht).
  **Noch offen in U3:** Dokumente-Karte, Rest-Inventar als Fußzeile, `ui/Avatar`,
  `TONE`/`KPI_TONE` auf `levelTone()`, **Rollen-Beweis mit einem zweiten Nutzer** (bisher
  nur als Admin geprüft).

## 4. Wichtige Stolpersteine, auf die man wieder treffen kann

- **Windows-Portfalle:** Nach Docker-/System-Neustart startet Supabase manchmal nicht
  („ports are not available … forbidden by its access permissions"). Ursache: Windows
  reserviert einen Portbereich, in dem 54321/54322 liegen. Fix braucht ein
  **Administrator-Terminal** (`net stop winnat && net start winnat`), Claude kann das
  nicht selbst beheben. Details + Diagnosebefehl in `CLAUDE.md`.
- **Playwright-Kalendertage** nicht über `getByRole`/Name ansprechen — Tage mit Jobs tragen
  ein `title`-Attribut, das den zugänglichen Namen überschreibt. Über Textinhalt filtern.
- **Test-Zeitraum immer in die Zukunft legen**, sonst landet der Job in der eingeklappten
  „Vergangen"-Gruppe und ist für den Test unsichtbar (obwohl korrekt angelegt).
- **`text-white` auf `bg-accent`** wurde durchgängig zu `text-accent-on` — falls neuer Code
  das wieder hart schreibt, bricht es beim nächsten hellen Akzent (z. B. Gelb-Variante).

## 5. Doku-Landkarte (wo was steht)

- `CLAUDE.md` → Arbeitsregeln, Stolpersteine, **aktuelle Reihenfolge der Großvorhaben**
- `IDEAS.md` → Was ansteht + Verlauf „Kürzlich umgesetzt"
- `PLAN-V1-ABSICHERN.md` → abgeschlossen, als Referenz
- `PLAN-UI-NEUSCHNITT.md` → **aktives Vorhaben**, U3-Rest → U4 (Kalender-Ebenen) → U5
  (Dokumente-Ordner) → U6 (Job-Abschnitte)
- `PLAN-NEUAUSRICHTUNG.md` → Block B (Anmietung/Kalkulation), wartet auf U-Etappen
- `PLAN-MEIN-PLAN.md` → persönliche Säule, M1 wird in U4 vorgezogen

## 6. Diese Datei danach

Nach dem Einlesen: diese Datei kann bleiben (nächste Übergabe überschreibt sie) oder nach
`docs/archiv/` verschoben werden, sobald der Inhalt in `IDEAS.md`/den Plänen aufgegangen
ist — analog zum alten `docs/archiv/HANDOVER.md`.
