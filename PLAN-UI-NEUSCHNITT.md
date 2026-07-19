# PLAN — UI/UX-Neuschnitt: helles Design + rundes Gesamtkonzept

> **Großes Vorhaben, wartet auf `PLAN-V1-ABSICHERN.md`.** Stand: **2026-07-18** —
> abgestimmt und freigegeben, Baubeginn **erst nach Etappe A3** (E2E-Netz).
>
> Grundlage: `docs/UI-REVIEW-2026-07-18.md` (Bestandsaufnahme) und
> `docs/mockups/` (drei Farbwelten + Vision). `ROADMAP.md` sagt WOHIN, `CLAUDE.md` WIE,
> hier stehen die **Details**.

---

## 1. Warum es dieses Vorhaben gibt

Till (2026-07-18): *„wir haben immer nur draufgesattelt"* — und später: *„lass uns von
außen drauf schauen und es krass verbessern vom UI/UX"*.

Das UI-Review hat den Befund bestätigt: **dasselbe UI-Bedürfnis ist 4–5-mal unabhängig
gelöst** (fünf Farb-Mappings, fünf Kennzahlen-Kacheln, drei Akkordeon-Implementierungen),
weil zwei Rezepte nebeneinander herliefen — das ältere „Jobs-Look"-Muster und das später
etablierte „Listen-Rezept".

Zwei Erweiterungen würden das verschärfen, wenn man sie einfach anhängt:
- **Anmietung + Kalkulation** (`PLAN-NEUAUSRICHTUNG.md`, Block B) lässt die
  Job-Detailseite von 7 auf **9–10 Karten** wachsen.
- **Die persönliche Säule** (`PLAN-MEIN-PLAN.md`) wäre der **11. Nav-Eintrag**.

**Befund von außen** (stand in keinem Dokument): Für einen zugewiesenen Freelancer ist die
App heute **weitgehend leer**. Er landet auf einem Dashboard voller Firmen-Kennzahlen, die
RLS ihm ausblendet — er hat **keinen sinnvollen Einstieg**.

## 2. Die Leitidee

**Die Startseite zeigt den nächsten Einsatz — für jeden seinen.**

Statt einer Firmenübersicht steht oben der eine Job, der als Nächstes zählt, mit Zeitplan,
Ort und Kunde. Dasselbe Muster trägt alle drei Rollen: Till sieht seinen nächsten Einsatz
plus Firmenzahlen; ein Freelancer sieht **seinen** Einsatz statt leerer Kacheln.

> **Bewusst nicht** „Mein Tag": Till plant **Events, keine Tage** (seine Korrektur,
> 2026-07-18). Die Metapher ist der nächste Einsatz, nicht der Kalendertag.

**Und die Trennlinie fürs Private** — nicht „privat vs. Firma", sondern:

| | Sichtbar als Inhalt | Wirkt nur als Blocker |
|---|---|---|
| **Was** | Eigene Jobs · Köln-Schichten | Schule · Klausuren · Ferien |
| **Wo** | Startseite, Kalender-Ebene, Auswertung | Kalender-Ebene (gedämpft), Kollisionswarnung |

Schule ist **nie eine Karte**, sondern der stille Grund für eine Warnung („Am 14.09. ist
Klausur"). Das hält den Job-Fokus, ohne dass etwas verschwindet.

## 3. Kern-Entscheidungen

### K-A · Themes über CSS-Variablen — Voraussetzung für alles Weitere
**Geprüfter Stand:** `tailwind.config.js` enthält **feste Hex-Werte**, die beim Bauen in
die Klassen einkompiliert werden; `index.css` setzt `color-scheme: dark` hart;
`darkMode: "class"` ist konfiguriert, aber **ungenutzt**. Eine Variablen-Schicht existiert
nicht → **Umschalten zur Laufzeit ist heute unmöglich.**

Einmalige Umstellung: Tokens auf `rgb(var(--…) / <alpha-value>)`, Themes in `index.css` als
`:root[data-theme="…"]`, Umschalter + Speicherung. Danach ist jedes weitere Theme fast
gratis — **inklusive Dark, dessen Werte bereits existieren** und nur das dritte
Variablen-Set werden.

**Der eigentliche Blocker:** Die fünf Farb-Mappings enthalten **hart kodierte Hex-Werte**
(u. a. `JOB_STATUS_HEX` in `JobDetailPage`). Sie würden beim Umschalten **nicht**
mitwechseln → helles Design mit dunklen Farbresten. Die Konsolidierung ist hier
**technische Voraussetzung, keine Kosmetik**.

**Ein Standard-Theme** wird im Verifikations-Ritual geprüft (Tills Wahl nach U1); die
anderen bleiben verfügbar, ohne bei jeder Änderung mitgeprüft zu werden — sonst
verdreifacht sich die Prüfarbeit dauerhaft.

### K-B · Das Persönliche verbraucht **keinen** Navigationsplatz
Stundenplan, Arbeitgeber und Verfügbarkeit liegen im **Nutzer-Menü** (Avatar oben rechts)
unter „Meine Zeiten" — Konvention professioneller Software für Profil-Gebundenes. Die
*Wirkung* passiert auf der Startseite und im Kalender. Kein neuer Bereich, kein
`app_area`-Wert. **Ersetzt** die frühere Idee einer eigenen Seite `/mein-plan`.

### K-C · Navigation in drei Gruppen statt zehn flacher Einträge
```
  Überblick                   ← Startseite: „Nächster Einsatz", rollen-adaptiv

  ARBEIT          Jobs · Kalender · Aufgaben · Anmietung
  KAUFMÄNNISCH    Anfragen / Kunden · Angebote · Rechnungen · Auswertungen
  ABLAGE          Dokumente · Inventar

  Verwaltung                  ← unten, managerOnly
```
`Inventar` rutscht nach „Ablage" (Rest-Inventar; entspricht E8/F6 der Neuausrichtung).
Mobile Fußleiste: **Überblick · Jobs · Kalender · Aufgaben**.

### K-D · Job-Detailseite bekommt Abschnitte statt einer Endlos-Spalte
Vier Anker (`Übersicht · Material · Geld · Ablage`) über `ui/Tabs` — dieselbe Komponente
wie überall, **kein neues Muster**. Erst dadurch ist Block B ohne Chaos einbaubar.

### K-E · Dokumente: Ordner nach Job statt Kategorie-Seitenleiste
Tills Wunsch (2026-07-18): *„nach Jobs sortieren und Ordnerstruktur, wie professionelle
Software."* Der `CategoryButton`-Eigenbau entfällt; Umschalter über `ui/Tabs`:
**Nach Job · Nach Kategorie · Nach Datum**, Standard **Nach Job**, Ordner-Anmutung
(aufklappbare Gruppen, Anzahl + Größe je Ordner).
**Kein Neubau:** `useAllDocuments` löst Job-/Kundennamen **bereits** je Zeile auf,
`lib/listGrouping.ts` + `GroupRow` können genau das — sie werden hier nur endlich benutzt.
Suche auf `ui/Input`, CSV-Export ergänzen.

### K-F · Konsolidierung fällt beim Umbau ab, statt eine eigene Etappe zu sein
Für den Theme-Umbau muss **jede** Farbzuordnung ohnehin angefasst werden (K-A) — dabei
werden aus fünf Mappings **eine** Registry. Analog: Die Startseite wird neu gebaut →
`MetricCard`/`KpiCard`/Inventar-Kacheln werden **ein** `SummaryStats`. Die sechs
Review-Befunde erledigen sich unterwegs; Mehraufwand nahe null.

### K-G · Struktur trägt „wer macht was" später, ohne es jetzt zu bauen
Tills Zukunftswunsch: *„Max holt die Technik bei Beuchel ab, Bela baut auf"* — ausdrücklich
**ferne Zukunft**. Der Zeitplan am Job (`job_milestones` existiert) ist der natürliche Ort.
Die Zeitplan-Karte wird so gestaltet, dass eine **Personen-Spalte später ohne Umbau**
hineinpasst. Kein Code, kein Schema jetzt — nur keine Tür zumauern.

## 4. Etappen

> **U1 ist ein Mockup** — Till entscheidet visuell, bevor Code entsteht (`ARBEITSWEISE.md`).
> Baubeginn erst nach `PLAN-V1-ABSICHERN.md` **A3**.

**U1 ✅ — Mockup des Gesamtkonzepts** *(kein Produktionscode; erledigt 2026-07-19)*
Als **eigene** Datei `docs/mockups/konzept-gesamt.html` gebaut statt das Farbmockup zu
erweitern — getrennte Zwecke: `dashboard-hell.html` zeigt **Farbwelten**,
`konzept-gesamt.html` zeigt **Struktur**. Beide teilen dieselben Tokens.

Enthalten: Navigation in drei Gruppen (K-C) · Startseite in **drei Rollen** über einen
Umschalter (Till · Verwaltung · Freelancer) · Job-Detailseite mit Abschnitten (K-D) ·
Dokumente als **Job-Ordner** (K-E) · Paletten-Umschalter Creme / Weiß+Indigo · markierte
Vorschau-Kacheln für noch fehlende Daten (`E2`, `E7`).

Screenshots im selben Ordner (`konzept-1-start-till.png` … `konzept-5-weiss-indigo.png`).
Gerendert und geprüft: Rollenwechsel greift (Freelancer sieht „Dein nächster Einsatz",
reduzierte Navigation, Verfügbarkeits-Karte), **keine Konsolenfehler**.

**Offen für Till:** Entscheidung über das **Standard-Theme** (Creme oder Weiß+Indigo) —
beide werden ohnehin gebaut, die Wahl bestimmt nur, welches im Verifikations-Ritual
geprüft wird (K-A).

**U2 ✅ — Theme-Fundament + eine Farb-Registry** *(erledigt 2026-07-19)*

`index.css` mit drei Theme-Sätzen als CSS-Variablen (**Creme = Standard**, Weiß, Dunkel) ·
`tailwind.config.js` auf `rgb(var(--c-…) / <alpha-value>)` · `lib/theme.ts` · Inline-Skript
gegen das Aufblitzen des falschen Themes · Theme-Auswahl im Konto-Dialog (K-B) ·
**`lib/statusTone.ts` als eine Registry** — ersetzt vier verstreute Status-Tabellen
(`JOB_STATUS_HEX`, `STATUS_HEX`, zwei × `STATUS_TONE`).

**Kontrast gemessen — der eigentliche Härtetest:** **Alle zwölf** bisherigen Statusfarben
lagen auf hellem Grund unter der Schwelle (**1,87:1 bis 4,23:1**, nötig 4,5:1). Die neuen
Werte sind auf Creme *und* Weiß geprüft; drei mussten nach der ersten Messung nachgedunkelt
werden (`packen`/`wartung` → `#9A4A08`, `abgeschlossen`/`verfuegbar` → `#14713A`).

**Voll bewiesen:** tsc · lint · 101 Vitest · build · **15/15 E2E gegen das neue Theme** ·
Browser mit echten Daten (Start, Jobs, Inventar, Rechnungen) · **375 px ohne horizontales
Scrollen** · keine Konsolenfehler · Theme-Umschaltung in allen drei Themes gemessen
(Kontrast 15,4 / 16,9 / 15,7). Screenshots: `u2-daten-*.png`, `u2-login-*.png`,
`u2-mobil-375.png`.

**Bewusst offen gelassen:** `TONE` (DashboardPage) und `KPI_TONE` (ReportsPage) sind
Kennzahlen-Ampeln, keine Status-Zuordnungen — sie fallen in **U3** weg, wenn die Startseite
neu gebaut wird. `levelTone()` steht dafür bereit.

**Stolperstein unterwegs (in `CLAUDE.md` dokumentiert):** Nach einem Docker-Neustart
startet Supabase auf Windows nicht mehr, weil das System den Portbereich mit 54321/54322
reserviert. Container melden „healthy", die API antwortet trotzdem nicht. Fix braucht ein
Administrator-Terminal (`net stop winnat` / `net start winnat`).

**U3 ✅ — Startseite „Nächster Einsatz" + neue Navigation** *(komplett 2026-07-19)*

**Navigation (K-C) fertig:** `lib/nav.ts` liefert jetzt `NAV_GROUPS` in drei Gruppen
(**Arbeit · Kaufmännisch · Ablage**), die Sidebar rendert sie mit Überschriften. Leere
Gruppen fallen automatisch weg — ein Mitarbeiter ohne kaufmännische Rechte sieht keine
verwaiste Überschrift. `Inventar` steht jetzt unter „Ablage" (E8/F6). Mobile Fußleiste:
**Überblick · Jobs · Kalender · Aufgaben**.

**Startseite:** Neue Komponente `components/dashboard/NextJobHero.tsx` — der nächste
Einsatz steht oben mit Zeitraum, Kunde, Ort, Status und **Zeitplan** (erledigte Punkte
durchgestrichen, der nächste offene hervorgehoben). Beschriftung ist rollen-abhängig
(„Dein nächster Einsatz" für Zugewiesene). Die Kennzahl **„Offene Rechnungen"** ersetzt
„Geräte verfügbar" — aber nur mit `angebote`-Recht, sonst bleibt die Geräte-Kachel stehen.
Beträge werden als Währung ausgegeben statt hochgezählt.

**Nebenbei behoben:** `text-white` auf Akzentflächen wurde in **20 Dateien** durch
`text-accent-on` ersetzt. Aktuell sind alle drei Akzente dunkel, das Ergebnis also gleich —
aber sobald ein heller Akzent dazukommt (Tills Gelb-Variante), wäre weiße Schrift darauf
unlesbar gewesen.

**Bewiesen:** tsc · lint · 101 Vitest · build · **15/15 E2E** · Browser mit einem echten
Testjob (Hero + Zeitplan sichtbar, „Nächster Einsatz — in 3 Tagen") · 375 px ohne
horizontales Scrollen · keine Konsolenfehler. Dabei fiel eine **doppelte Zeitplan-Anzeige**
auf (Hero + alter Block) — behoben. Testdaten restlos entfernt (Gegenprobe: 0).

**Noch offen in U3:**
- ~~Karte „Zuletzt abgelegte Dokumente"~~ ✅ 2026-07-19 — nutzt `useAllDocuments`
  (seit D3), zeigt die letzten 5 mit Kategorie-Icon, Vorgang und Datum; Klick öffnet
  die signierte URL wie in `DocumentsCard`.
- ~~Rest-Inventar auf eine schmale Fußzeile eindampfen~~ ✅ 2026-07-19 — „Gerätestatus"-
  und „Geräte im Einsatz"-Karte (Balken + Ring) durch eine Zeile ersetzt: Status-Punkte
  mit Zahl, Auslastung, Link zu Inventar. `DeviceStatusBars`/`UtilizationRing` entfernt.
- ~~`ui/Avatar.tsx` als geteilte Komponente~~ ✅ 2026-07-19 — sechs Nachbauten
  (Jobs, Job-Zuweisung ×2, Kundenliste, Website-Anfragen, Dashboard) auf
  `components/ui/Avatar.tsx` gezogen.
- ~~`TONE`/`KPI_TONE` auf `levelTone()` ziehen~~ ✅ 2026-07-19 — `kpiToneClass()`
  in `lib/statusTone.ts` ersetzt beide Kopien (Dashboard, Auswertungen).
- ~~Rollen-Beweis mit einem zweiten Nutzer~~ ✅ 2026-07-19 — als „Max Deger" (Rolle
  `mitarbeiter`, `job_view_mode: zugewiesene`) angemeldet: „Dein nächster Einsatz —
  in 2 Tagen" personalisiert, Kennzahlen/Listen zeigen echten Inhalt statt leerer
  Kacheln, „Verwaltung" korrekt ausgeblendet.

**✅ Bug behoben 2026-07-19 — Job anlegen schlug fehl für `job_view_mode: zugewiesene`:**
Beim Rollen-Beweis wollte ich testweise als „Max Deger" (Rechte `jobs: can_edit=true`,
aber `job_view_mode: zugewiesene`) einen Job anlegen — Fehlermeldung „Job konnte nicht
angelegt werden", Netzwerk zeigte `POST .../jobs → 403`. **Root Cause gefunden und mit
curl gegen die reine RLS-Schicht reproduziert** (kein UI-Bug): `useCreateJob`
(`apps/web/src/hooks/useJobs.ts`) machte `.insert(...).select().single()` — die
RETURNING-Zeile muss die `jobs_sel`-Policy (`can_see_job`) erfüllen. `can_see_job` lässt
den Ersteller nur durch, wenn er bereits in `job_assignees` steht **oder**
`job_view_mode = 'alle'` **oder** (`'eigene'` und `created_by = auth.uid()`) — bei
`'zugewiesene'` keins von beidem, und die Zuweisung passierte erst **nach** dem Insert
(zweiter Request, aus `CreateJobDialog`). Mit `Prefer: return=minimal` gelang derselbe
Insert (201) — bestätigte die Diagnose. **Wahrscheinlich dieselbe Ursache wie der seit
Wochen rote CI-E2E-Job** (`job-flow.spec.ts`, „Abgelehnte Schreibzugriffe: POST 403").

**Fix (reines Frontend, keine RLS-Änderung nötig):** `useCreateJob` nimmt jetzt optional
`assigneeIds` entgegen und schreibt in dieser Reihenfolge: (1) Job **ohne** `.select()`
anlegen (erzwingt keine sofortige Sichtbarkeit), (2) `job_assignees` schreiben — braucht
nur `can_edit_area('jobs')`, keine `SELECT`-Sicht —, (3) `calendar_entries` aus den schon
bekannten Werten, (4) den Job **danach** per `.maybeSingle()` zurückholen (jetzt sichtbar,
weil zugewiesen). Bleibt der Ersteller unzugewiesen (Randfall bei `zugewiesene`), liefert
ein lokal zusammengesetzter Fallback statt eines Fehlers — der Job entsteht trotzdem
korrekt, ist für den Ersteller danach nur konsistent unsichtbar (wie jeder unzugewiesene
Job). `CreateJobDialog` reicht `assigneeIds` direkt durch, der separate
`useSetJobAssignees`-Aufruf entfällt dort.

**Bewiesen:** tsc · lint · 101 Vitest · build · Browser als „Max Deger" (`zugewiesene`):
Job **mit** Selbstzuweisung → `POST 201`, danach `GET .../jobs?id=eq…` → `200` (vorher
`403`) · Job **ohne** Zuweisung → kein Absturz, Zeile korrekt in der DB (`created_by` =
Max, Status `anfrage`), erwartungsgemäß nicht in seiner Liste. Testdaten restlos entfernt
(Gegenprobe: Job-Anzahl wieder bei 6, keine verwaisten `calendar_entries`).

**✅ CI-E2E jetzt grün (2026-07-19, Lauf #49):** Der Fix behob den 403, deckte danach
aber einen **zweiten, unabhängigen** Fund auf derselben Baustelle auf: Der CI-Testnutzer
(`.github/workflows/ci.yml`, Schritt „Erst-Admin anlegen") bekam bisher nur `role='admin'`
gesetzt — `job_view_mode` blieb beim Spalten-Default `'zugewiesene'`, während der lokale
Seed-Admin `'alle'` hat. Ergebnis: Der Test legte den Job jetzt zwar an, sah ihn aber
nicht in der Liste (dieselbe `can_see_job`-Logik, diesmal nicht als Fehler, sondern als
korrekt gefilterte, aber für einen Testnutzer falsche Sicht). Fix: `job_view_mode='alle'`
in der Profil-Anlage ergänzt. **Beide Jobs (`ci`, `e2e`) liefen danach grün** — erstmals
seit Wochen. `e2e/job-flow.spec.ts` bleibt unverändert; es war nie ein Testfehler.

**U4 🟡 — Kalender als Ebenen-Modell** *(Kern erledigt 2026-07-19)*

**M1-Fundament (aus `PLAN-MEIN-PLAN.md`, vorgezogen):** Migration `0039_personal_blocks.sql`
— `personal_blocks` (konkrete Zeiträume) + `personal_recurring_blocks` (wöchentliche
Regel, für später/Stundenplan). RLS bewusst **strikt `user_id = auth.uid()`** (E-A) —
auch Admin/Verwaltung sehen fremde Zeilen nicht; per `migrations-pruefer` freigegeben und
per psql bewiesen (Admin sieht 0 Zeilen von Max, Max sieht seine eigene). `personal_settings`
(Geburtsdatum/Stundensatz) bewusst **noch nicht gebaut** — wird erst mit M3/M4 gebraucht.

**`lib/personalSchedule.ts`:** reine Auflösung „Regel → Termine im Zeitraum" +
`isVisibleBlockCategory` (nur `koeln_schicht` ist Inhalt, alles andere nur Blocker).
7 Vitest-Tests, inkl. Sommerzeit-Wechsel (29.3.2026) — lokale Uhrzeiten bleiben über die
Umstellung hinweg stabil, weil mit lokalen `Date`-Objekten statt UTC-Arithmetik gerechnet
wird.

**„Meine Zeiten" im Konto-Dialog (E-B):** `PersonalScheduleSection` — eigene Köln-Schichten/
Schule/Klausur/Ferien/Urlaub/Krank eintragen und wieder löschen, kommende Einträge als
Liste. Kein eigener Nav-Punkt.

**Kalender:** Ansichts-Umschalter (Monat/Woche/Tag/Agenda) jetzt auf `ui/Tabs` statt
Eigenbau. Neuer Umschalter „Meine Zeiten" (an/aus, Standard an) blendet die persönliche
Ebene in der **Monatsansicht** ein: Köln-Schichten als schmaler Chip (sichtbarer Inhalt),
alles andere nur als stiller grauer Punkt ohne Beschriftung — nie eine Karte.

**Bewiesen:** tsc · lint · 108 Vitest (7 neu) · build · Browser als „Max Deger": Eintrag
über „Meine Zeiten" angelegt (Köln-Schicht + Schule) → im Kalender sichtbar (Chip +
Punkt), Umschalter blendet beides zuverlässig aus/ein, 375 px ohne horizontales Scrollen,
keine Konsolenfehler. Testdaten restlos entfernt.

**Noch offen (bewusst auf später vertagt, um schnell einen nutzbaren Kern zu liefern):**
- Persönliche Ebene nur in der **Monatsansicht** — Woche/Tag/Agenda fehlt noch.
- „Meine Einsätze" als eigene Ebene (Jobs, denen man zugewiesen ist, hervorgehoben) —
  bräuchte `assignees` im `useCalendarEntries`-Query, noch nicht verdrahtet.
- Wiederkehrende Regeln (`personal_recurring_blocks`) haben noch **keine UI** — die
  DB-Tabelle und `resolveRecurringBlock()` sind fertig und getestet, aber „Meine Zeiten"
  legt bisher nur konkrete Blöcke an. Stundenplan-Eintrag folgt als nächster Schritt.
- Kollisionswarnung bezieht sich weiterhin nur auf Firmen-Termine — persönliche Blöcke
  gegen Jobs prüfen ist M5 (Team-Verfügbarkeit), eigenes Vorhaben.

**U5 ✅ — Dokumente als Job-Ordner** *(erledigt 2026-07-19)*
`DocumentsPage` zeigt jetzt Ordner je Vorgang: Umschalter **Nach Job · Nach Kategorie ·
Nach Datum** (Standard Nach Job) auf `ui/Tabs`, aufklappbare Ordner mit Anzahl + Größe,
`Folder`/`FolderOpen`-Icon, „Öffnen"→Vorgang. `CategoryButton`-Eigenbau entfällt, nutzt
`entityLabel`/`entityHref` aus `useAllDocuments` (seit D3). CSV-Export ergänzt.
Review-Befund #4/#6: `LinkedOffersCard`/`LinkedInvoicesCard` in
`components/shared/LinkedFinanceCards.tsx` ersetzen die doppelte „verknüpfte
Angebote/Rechnungen"-Karte in Job- und Kundendetail (~130 Zeilen Duplikat weg).

**U6 ✅ — Job-Detailseite in Abschnitte** *(erledigt 2026-07-19)*
Vier Anker über `ui/Tabs`: **Übersicht** (Zeitplan + Notizen), **Material** (Packliste),
**Geld** (Angebote + Rechnungen), **Ablage** (Dokumente + Aufgaben). Status/Zugewiesene/
Farbe bleiben als Sidebar. Erst dadurch zieht Block B ohne Chaos in die Struktur ein.
Browser-geprüft (Übersicht/Material/Geld durchgeklickt, Sidebar bleibt).

## 5. Verhältnis zu den anderen Plänen ⚠️

- **`PLAN-V1-ABSICHERN.md`** läuft **vorher**. A3 (E2E-Smoke) ist das Netz für diesen Umbau.
- **Parallele Session (Creme-Mockup):** hat `docs/mockups/` erzeugt, **keinen
  Produktionscode** → bisher kein Konflikt. **Ab U2 darf nur eine Session
  `tailwind.config.js` und die Startseite anfassen.**
- **`PLAN-NEUAUSRICHTUNG.md`:** E8 geht in U3 auf. E1–E7 unverändert — die U-Etappen laufen
  **davor**, damit Block B in die neue Struktur einzieht.
- **`PLAN-MEIN-PLAN.md`:** M1 wird nach U4 vorgezogen, M2 geht in U4 auf. M3–M6 bleiben.

## 6. Risiken

1. **Zwei Sessions am selben UI** — größtes Risiko, siehe §5. Vor U2 klären.
2. **Übersehene Hex-Werte** → helles Theme mit dunklen Farbresten. Nach U2 gezielt nach
   `#`-Literalen in `src/` suchen; erlaubt bleiben nur die dynamischen Kategorie-/Set-Farben
   aus der DB (dokumentierte Ausnahme).
3. **Kontrast-Regression** auf hellem Grund — jeder Wert messen und **benennen**.
4. **Theme-Pflegeaufwand:** drei Themes = dreifache Prüfung → Gegenmittel in K-A.
5. **Rollen-Blindheit:** Startseite in **allen drei** Rollen prüfen, sonst baut man wieder
   nur Tills Sicht.
6. **Scope-Falle:** „wer macht was im Ablauf" ist ferne Zukunft (K-G) — nicht mitbauen.

## 7. Verifikation (je Etappe)

1. Prüfkette grün: `tsc --noEmit` · `pnpm lint` · `pnpm test` · `pnpm build`.
2. **Browser-Beweis** über Preview-MCP (`web-dev`): jede geänderte Seite bei **375 px und
   Desktop**, Konsole fehlerfrei.
3. **Theme-Beweis** (U2): alle Themes durchgeschaltet, keine Farbreste; Kontrastwerte der
   acht `job-*` und vier `status-*` **benannt**.
4. **Rollen-Beweis** (U3): zweiter Nutzer ohne Manager-Rechte — Startseite zeigt sinnvolle
   Inhalte statt leerer Kacheln.
5. **Unit-Test** für `lib/statusTone.ts`.
6. Nach jeder Etappe: Haken + Datum hier, `IDEAS.md` pflegen, Commit + Push.

## 8. Verlauf

- **2026-07-18:** UI-Review erstellt (`docs/UI-REVIEW-2026-07-18.md`). Parallel drei
  Farbwelten als Mockup (`docs/mockups/`). Till entscheidet: **Umstieg auf hell**, Creme
  oder Weiß+Indigo **umschaltbar** statt festgelegt, Dark später zurück; Startseite
  **„Nächster Einsatz"** statt Tages-Metapher; Schule **klein**; Dokumente **nach Jobs +
  Ordner**; „wer macht was" **ferne Zukunft**. Plan freigegeben, Baubeginn nach A3.
