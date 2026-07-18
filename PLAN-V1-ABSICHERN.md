# PLAN — V1 absichern (bevor die großen UI-Umbauten kommen)

> **Aktives Vorhaben.** Stand: **2026-07-18** — Schritt 0 (Wissen ins Repo) erledigt;
> nächste Etappe **A1** (Restore einmal real durchspielen).
>
> Verhältnis zu den anderen Dokumenten: `ROADMAP.md` sagt WOHIN (dieses Vorhaben ist dort
> Phase 0), `CLAUDE.md` sagt WIE (Regeln/Rituale), hier stehen die **Details**. Danach
> folgt `PLAN-UI-NEUSCHNITT.md`.

---

## 1. Warum es dieses Vorhaben gibt

Till (2026-07-18): *„lass uns aber vorher, bevor wir die großen Umbauten machen, es
absichern, dass es eine fertige v1 ist."*

Die Begründung ist stichhaltig: Der geplante UI-Neuschnitt (Theme-Umstellung, Navigation,
Startseite, Dokumente, Job-Detailseite) fasst **jede Seite der App** an. Ohne Sicherheits-
netz ist das riskant — und ein Umbau ist der denkbar schlechteste Zeitpunkt, um
festzustellen, dass ein Backup nicht funktioniert.

**Grundsatz dieses Vorhabens:** „v1 fertig" heißt **nicht** „alle Features gebaut",
sondern **„das Vorhandene ist bewiesen sicher"**.

## 2. Geprüfter Ist-Zustand (2026-07-18 — Belege, keine Vermutungen)

Diese Prüfung wurde real durchgeführt. **Eine neue Session muss sie nicht wiederholen.**

| Prüfung | Ergebnis |
|---|---|
| `pnpm --filter @eventtech/web exec tsc --noEmit` | ✅ grün |
| `pnpm lint` (`--max-warnings 0`) | ✅ grün |
| `pnpm test` | ✅ **79 Tests** in 7 Dateien, alle grün |
| Git | alles gepusht, keine offenen Commits |
| `TODO`/`FIXME`/`HACK` in `apps/web/src` | **0 Treffer** |
| Automatisches DB-Backup | ✅ **läuft real** — Artefakt `db-backup-2026-07-18_0534` (26 kB), per Zeitplan **ohne menschliches Zutun** entstanden |

**Folge:** ROADMAP **P0.1 ist sachlich erfüllt** („fertig, wenn ein Backup nachweislich
ohne menschliches Zutun entstanden ist"). Der Haken dort wird mit A4 nachgezogen.

**Der Code ist gesund.** Das Wachstums-Problem („nur draufgesattelt") betrifft die
**UI-Struktur**, nicht die Code-Qualität — siehe `docs/UI-REVIEW-2026-07-18.md`.

## 3. Die echten Lücken

1. **Storage-Dateien sind nicht gesichert.** `.github/workflows/db-backup.yml` sichert
   ausschließlich die Datenbank (Kommentar Zeile 8–9: „Storage-Dateien … bewusst noch
   NICHT enthalten — Stufe 2"). Seit **Block A** liegen im privaten `documents`-Bucket
   Genehmigungen, Baupläne und auto-archivierte Rechnungs-PDFs.
   → **„Es kann nichts verloren gehen" ist heute nicht wahr.** Entspricht Risiko #7 aus
   `PLAN-NEUAUSRICHTUNG.md`.
2. **Restore wurde nie geprobt** (P0.2). Ein nie zurückgespieltes Backup ist ein
   Versprechen, kein Netz.
3. **Kein E2E-Netz** (P0.4). Kein Playwright; **keine** Testdatei klickt durch eine Seite.
   Die 79 Tests decken Rechenlogik ab (Summen, Verfügbarkeit, Gruppierung) — sie merken
   **nicht**, wenn nach einem Umbau eine Seite weiß bleibt.
4. **Stille Backup-Falle.** Der Workflow läuft **grün durch, wenn die Secrets fehlen**
   („ruhig by default"). **Grün beweist also nicht, dass gesichert wurde** — nur das
   Artefakt tut das. Diese Unterscheidung fehlt bisher in der Doku.
5. **Ungetestete Logik-Dateien:** `csv.ts`, `datetime.ts`, `ics.ts`, `printPacklist.ts`,
   `backup.ts`, `companyInfo.ts`.

## 4. Etappen

**Reihenfolge:** A4 (klein, sofort) → A1 → A2 → A3.
A1+A2 sichern die **Daten**, A3 sichert den **Umbau**.

### A1 ✅ — Restore einmal real durchspielen *(P0.2, erledigt 2026-07-18)*

**Durchgeführt mit einem echten Cloud-Dump** (nur lesend gezogen), Ziel war eine separate
lokale Datenbank — die Entwicklungs-DB blieb unberührt (Gegenprobe: 6 Jobs unverändert),
Testdatenbank danach entfernt.

**Ergebnis: der dokumentierte Weg war falsch.** Restore in eine nackte
`create database`-DB scheitert mit **109 Fehlern** — das Backup setzt die
Supabase-Plattform-Schemas (`auth`, `extensions`, `vault`) voraus. Richtiges Ziel ist ein
**frisches Supabase-Projekt**. Korrigiert in `DEPLOY.md`.

**Gegen eine Instanz mit Plattform-Basis lief der Restore sauber:**
Schema 1 Rest-Fehler (`publication supabase_realtime`, in echtem Projekt vorhanden),
Daten 1 Rest-Fehler (Versionsdrift einer `auth`-Plattformtabelle, kein Datenverlust).
Wiederhergestellt: 5 Logins, 5 Profile, 29 Geräte, 14 Packlisten-Posten, 2 Angebote —
plus **31 Tabellen mit RLS, 113 Policies, 46 FKs, 16 Trigger, 46 Funktionen** inkl.
`issue_invoice()`, `can_see_document()`, `has_area()`.

**Der pg_dump-Warnhinweis** zu `--disable-triggers` hat sich **nicht** materialisiert.

**Nicht getestet (ehrlich):** Die App wurde **nicht** gegen die wiederhergestellte DB
gestartet — dafür müsste die lokale Supabase-API umkonfiguriert werden, was die
Entwicklungsumgebung angefasst hätte. Der Beweis liegt auf DB-Ebene (Daten + Rechte +
Invarianten vollständig).

**Verschärft A2:** `storage.objects` wird wiederhergestellt, die **Dateien nicht** — nach
einem Restore zeigt der Eintrag fürs **Firmenlogo** ins Leere, und das Logo steckt in
jedem Rechnungs-/Angebots-PDF. Vollständige Bucket-Liste (A2 muss **alle fünf** sichern,
nicht vier): `company-assets`, `device-photos`, `job-photos` (public),
`device-documents`, `documents` (privat).

<details><summary>Ursprüngliche Planung (Referenz)</summary>
Artefakt `db-backup-2026-07-18_0534` herunterladen und in eine **leere lokale
Supabase-Instanz** zurückspielen (`01_roles` → `02_schema` → `03_data`), App dagegen
starten, einloggen, Stichproben prüfen: eine Rechnung **mit Nummer**, ein Job mit
Packliste, ein Dokument-Eintrag.
- *Fertig, wenn:* aus einem echten Backup eine funktionierende App entstand.
- Exakte Befehle **und aufgetretene Stolpersteine** in `DEPLOY.md` („Backup & Restore").
- **Kein Eingriff in Produktion** — rein lokal.
- ⚠️ Diese Übung kann Unangenehmes zeigen (z. B. dass etwas im Dump fehlt). Das ist ihr
  Zweck — Ergebnis **ehrlich berichten**, nicht wegdiskutieren.

</details>

### A2 ✅ — Storage-Dateien ins Backup *(P0.1 Stufe 2, erledigt 2026-07-18)*

`db-backup.yml` um einen Storage-Schritt erweitert, der **alle** Buckets sichert und als
zweites Artefakt `storage-backup-<datum>` ablegt.

- **Buckets dynamisch aufgelistet** statt fest verdrahtet — ein später angelegter Bucket
  wird automatisch mitgesichert. (Begründung aus der Praxis: geplant waren vier Buckets,
  tatsächlich sind es fünf.)
- **Nach** dem DB-Upload platziert: Scheitert Storage, ist die Datenbank schon gesichert.
- **Größen-Wachposten:** > 2 GB → **harter Fehler** mit dem Hinweis auf ein externes Ziel
  (Cloudflare R2); > 1 GB → Warnung. Lieber lauter Fehler als stilles Teil-Backup.
- Manifest je Bucket (Anzahl + Größe), Zusammenfassung im Lauf zeigt beide Artefakte.

**Lokal verifiziert** (dieselben Befehle wie im Workflow, gegen die Cloud, nur lesend):
Bucket-Parsing liefert alle fünf; die Download-Schleife holte das Firmenlogo
(`company-assets/logo-….jpg`); Manifest-Ausgabe korrekt; heruntergeladene
Produktionsdateien danach entfernt.

⚠️ **Noch nicht bewiesen:** Ein echter Lauf in GitHub Actions. Der Workflow-Code ist
lokal mit identischen Befehlen verifiziert, aber der Lauf auf dem Runner (Linux, frische
CLI) ist ungetestet — er läuft nachts um 03:14 UTC automatisch oder kann über
*Actions → Run workflow* sofort ausgelöst werden. **Erst danach ist P0.1 Stufe 2 wirklich
belegt.**

⚠️ **Bekannte Bruchstelle:** `supabase storage` benötigt derzeit `--experimental`. Bricht
der Schritt nach einem CLI-Update, ist dieses Flag der erste Verdächtige (steht als
Kommentar im Workflow).

<details><summary>Ursprüngliche Planung (Referenz)</summary>
`db-backup.yml` um die Buckets erweitern: `documents` (privat!), `device-photos`,
`device-documents`, Meilenstein-Fotos. Eigener Schritt, der über die Storage-API listet
und herunterlädt; Ergebnis als zweites Artefakt.
- Manifest ergänzen: Anzahl Dateien + Gesamtgröße je Bucket.
- Klare Fehlermeldung bei Erreichen des Artefakt-Limits — **lieber lauter Fehler als
  stilles Teil-Backup**.
- *Fertig, wenn:* ein Lauf ein Artefakt erzeugt, das eine hochgeladene Testdatei
  nachweislich enthält (danach Testdatei entfernen).

</details>

### A3 ✅ — E2E-Smoke-Test *(P0.4, erledigt 2026-07-19)*

Playwright (nur Chromium) mit **15 Tests**, Laufzeit ~30 s:
- **Seiten-Smoke** über alle 11 Hauptseiten: `<main>` vorhanden, sichtbarer Inhalt,
  keine Fehler-/Ersatzansicht, **keine JS-Fehler**. Dazu unbekannte Route und
  Navigations-Klickpfad.
- **Job-Durchstich**: anlegen → in der Liste finden → Detailseite → Papierkorb (mit
  Bestätigung) → aus der Liste verschwunden.
- Befehle: `pnpm --filter @eventtech/web e2e` (bzw. `e2e:ui`).

**Mutationsprobe bestanden** — und sie hat einen echten Mangel aufgedeckt: Die erste
Fassung meldete **grün, obwohl eine Seite abstürzte**, weil sie die noch intakte
App-Hülle prüfte und fertig war, bevor der Absturz durchschlug. Erst mit
`waitForLoadState` + kurzer Wartezeit und der Fehlerprüfung **am Ende** wurde exakt die
manipulierte Seite rot, alle anderen blieben grün.

**Vier Stolpersteine, die im Code dokumentiert sind:**
1. **Rate-Limit:** Meldet sich jeder Test einzeln an, drosselt Supabase-Auth nach wenigen
   Versuchen — die ersten Tests sind grün, der Rest scheitert an Timeouts und sieht aus
   wie ein kaputtes UI. Lösung: einmalige Anmeldung in `auth.setup.ts`, Sitzung
   wiederverwenden (13 Tests: 3,9 min mit 10 Fehlern → 19 s alles grün).
2. **Kalendertage nicht über `getByRole`:** Tage mit Jobs tragen ein `title`
   (z. B. „Geburtstag"), das den zugänglichen Namen überschreibt — der Button heißt dann
   nicht mehr „15".
3. **Termin in der Zukunft wählen:** Ein Testjob in der Vergangenheit landet in der
   eingeklappten Gruppe „Vergangen" und ist unsichtbar — er wird korrekt angelegt, der
   Test sieht ihn nur nicht.
4. **Aufräumen:** Der Papierkorb-Weg löscht nur weich; `global-teardown.ts` entfernt die
   `TEST-E2E`-Reste endgültig (verifiziert: 0 Reste).

**Nebenbefund, sofort behoben:** Der bestehende Test `inspectionStatus` in
`database.test.ts` war **zeitzonenabhängig** — sein Helfer baute das Datum über
`toISOString()` (UTC), die Funktion rechnet aber mit dem lokalen Kalendertag. Zwischen
00:00 und 02:00 MESZ galt „heute" dadurch als überfällig. Real aufgetreten um 00:21.
Behoben durch `dateToInput` aus `lib/datetime.ts`.

⚠️ **CI: noch nicht Pflicht.** Der neue `e2e`-Job in `ci.yml` (eigener Job, fährt einen
Supabase-Stack hoch) konnte lokal **nicht** erprobt werden und läuft deshalb mit
`continue-on-error: true` — er darf die Pipeline nicht blockieren, bevor er einmal
nachweislich grün war. **Sobald ein Lauf grün ist, diese Zeile entfernen** (steht als
Kommentar im Workflow).

<details><summary>Ursprüngliche Planung (Referenz)</summary>
Playwright einführen (nur Chromium, gegen den lokalen Stack):
- **Ein** durchgehender Flow: Login → Job anlegen → Gerät auf die Packliste → Angebot
  erzeugen → Rechnung stellen (Nummer prüfen) → Testdaten aufräumen.
- **Smoke über alle Hauptseiten:** jede Route lädt, Konsole fehlerfrei, kein leerer
  Bildschirm. Genau das fängt die typischen Umbau-Fehler (kaputte Route, weißer
  Bildschirm) — deshalb **vor** den U-Etappen.
- In `ci.yml` einhängen. **Vitest v2 bleibt unberührt** (v4 ist mit Vite 5 inkompatibel).
- *Fertig, wenn:* ein absichtlich eingebauter Fehler den Test **rot** macht.
- ⚠️ Lieber **ein stabiler** Flow als fünf wacklige — flaky Tests werden ignoriert und
  sind dann wertlos.

</details>

### A4 — Wahrheit in der Doku *(klein, sofort)*
- `ROADMAP.md`: P0.1 abhaken **mit Beleg** (Artefaktname + Datum); Stufe-2-Vermerk auf A2.
- `DEPLOY.md`: die **„grün ≠ gesichert"-Falle** (Lücke 4) explizit benennen — woran man
  erkennt, dass wirklich gesichert wurde (Artefakt vorhanden, Manifest nicht leer).
- Tests für ungetestete Logik nachziehen, **priorisiert**: `csv.ts`, `datetime.ts`
  (breit genutzt); Rest nach Bedarf.

## 5. Was „v1" bewusst NICHT umfasst

- **Mahnwesen und Lead-Benachrichtigung bleiben ruhig** (nicht deployt, kein
  `RESEND_API_KEY`). Das ist **kein Mangel**, sondern das dokumentierte „standardmäßig
  ruhig"-Prinzip — Scharfschalten ist ROADMAP-Phase 3 und braucht Tills Freigabe.
- **Keine neuen Features.**
- **Kein Anfassen von Produktionsdaten** — A1 läuft rein lokal.

## 6. Risiken

1. **A2 Artefakt-Größe:** Fotos können das GitHub-Limit sprengen. Dann **anhalten und
   Till fragen** (externes Ziel wie Cloudflare R2), statt still zu kürzen.
2. **A1 zeigt evtl. Lücken im Dump** — Zweck der Übung, ehrlich berichten.
3. **A3 Flakiness** — siehe oben.
4. **Zwei Sessions am selben UI:** vor `PLAN-UI-NEUSCHNITT.md` klären, wer baut.

## 7. Verifikation

1. Prüfkette grün vor jedem Commit: `tsc --noEmit` · `pnpm lint` · `pnpm test` · `pnpm build`.
2. **A1:** Screenshot der aus dem Restore laufenden App + Stichproben-Ergebnis benennen.
3. **A2:** Artefakt-Manifest zeigt die Testdatei; danach Testdatei entfernt.
4. **A3:** absichtlich eingebauter Fehler macht den Test rot (Beweis, dass er greift).
5. Nach jeder Etappe: Haken + Datum hier, Eintrag in `IDEAS.md`, Commit + Push.

## 8. Verlauf

- **2026-07-18:** Vorhaben angestoßen (Tills Wunsch, vor dem UI-Umbau abzusichern).
  Ist-Zustand real geprüft (Prüfkette grün, 79 Tests, Backup-Artefakt belegt), fünf
  Lücken benannt. Schritt 0 (Wissen ins Repo) umgesetzt. Nächster Schritt: **A1**.
