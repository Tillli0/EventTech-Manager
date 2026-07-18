# Ideen & Weiterentwicklung — EventTech-Manager

> **Wie das hier funktioniert:** „Weiterentwicklung" ist der **Standard bei jeder Anfrage**
> (siehe `CLAUDE.md`) — ein **`+` am Anfang schaltet sie aus** (dann nur die genannte Aufgabe).
> Im Normalfall setzt Claude **kleine, risikoarme** Verbesserungen selbst um (verifiziert,
> committet, gepusht), **schlägt Größeres erst vor**, pflegt diese Datei und **berichtet
> jedes Mal**, was passiert ist.
>
> Legende — **Aufwand** S/M/L · **Wirkung** ★–★★★ · **Auto** = Claude darf eigenständig
> umsetzen (klein/risikoarm) / **Freigabe** = vorher fragen.

> **🧭 Strategiewechsel (2026-07-17): Verleih → Event-Dienstleister.** Kein eigener
> Vermiet-Bestand mehr; künftig Veranstaltungen planen/umsetzen und Technik anmieten.
> Das große Vorhaben (Dokumenten-Ablage, Anmietung, Kalkulation) steht in
> `PLAN-NEUAUSRICHTUNG.md`, die Reihenfolge in `ROADMAP.md` (Phasen 1–2). Einige
> Altpunkte unten sind dadurch herabgestuft — siehe eigene Rubrik.

## 🔧 Quick Wins (Auto — kann Claude eigenständig erledigen)

- [ ] **Leere-Zustände/Ladezustände** vereinheitlichen, wo noch nicht (Konsistenz-Pass). · S · ★ · Auto
- [ ] **impeccable-Altbefunde (objektive):** `transition: width` auf DashboardPage:362
      (Layout-Ruckler — auf transform/grid umstellen) und `font-family: Arial` in
      `lib/printPacklist.ts:50` (Druck-Layout auf Inter/system-ui angleichen). Die
      `border-l`-Akzentbalken-Befunde bleiben bewusst — dokumentierte Design-Sprache. · S · ★ · Auto

## 🚀 Größere Features (Freigabe nötig — Claude schlägt vor)

- [ ] **Globale Suche + Änderungsprotokoll** — projektweite Suche (Geräte/Jobs/Kunden/Angebote)
      und ein Audit-Log, wer wann was geändert hat. · L · ★★★ · Freigabe
- [ ] **E2E-Tests (Playwright)** — Smoke-Flow Login → Job → Packliste → Rechnung;
      Unit-Tests + CI existieren seit 2026-07-02 (Vitest, 46 Tests). · M · ★★ · Freigabe
- [ ] **Dashboard-Kachel „Offene Rechnungen"** — Summe offen/überfällig im Überblick. · S · ★★ · Auto
- [ ] **Automatische DB-Backups** der Cloud-DB (regelmäßiger `pg_dump` via GitHub-Action,
      Artefakt/Storage). Braucht vom Nutzer einen GitHub-PAT-Secret (`GH_DISPATCH_TOKEN`).
      Ergänzt das bereits umgesetzte manuelle JSON-Backup (s. „Kürzlich umgesetzt"). · M · ★★ · Freigabe
- [ ] **Spam: Cloudflare-Turnstile-Captcha** zusätzlich zu Honeypot + Rate-Limit, falls Spam durchkommt. · M · ★ · Freigabe
- [ ] **Performance: Code-Splitting** — große Chunks aufteilen (`react-pdf` ~1,3 MB, `DeviceDetailPage`
      ~0,98 MB lazy-laden), schnellerer Erststart. · M · ★★ · Freigabe

## 💡 Kleinere Verbesserungen / Backlog

- [ ] **Kalender-Feed-Abo-Link** prüfen/aktivieren (`calendar-feed` existiert, Cloud-URL nutzbar;
      `VITE_CALENDAR_FEED_BASE_URL`). · S · ★★ · Freigabe
- [ ] **Lead-Notizen** — interne Notiz pro Website-Anfrage vor dem Konvertieren. · S · ★ · Freigabe
- [ ] **Dubletten-Check auch bei manueller Kundenanlage** (nicht nur bei Lead-Konvertierung). · S · ★★ · Freigabe

### Aus der Neuausrichtung entstanden (nach den Kern-Etappen)

- [ ] **Lieferanten-Preishistorie** — „was hat Verleiher X zuletzt für eine LED-Bar genommen?"
      (EK-Preise je Gerätetyp über Anmiet-Vorgänge). · M · ★★ · Freigabe
- [ ] **Engpass-Sammelansicht** (E9) — Anmiet-Bedarf über alle anstehenden Jobs, „Anmieten"-
      Shortcut je Zeile. · M · ★★ · Freigabe
- [ ] **InventoryPage-Badge „+X angemietet"** — angemietete Mengen am Gerät sichtbar. · S · ★ · Auto
- [ ] **Stundensatz-Presets** in `company_settings` (bewusst NICHT an `profiles` — Datenschutz),
      als Vorbelegung bei Personalkosten. · S · ★ · Freigabe
- [ ] **Bestell-PDF als Mail-Anhang** (V2 der Bestell-Mail an Verleiher). · S · ★ · Freigabe
- [ ] **Dokumente: Volltext/OCR-Suche** über hochgeladene PDFs (später, größer). · L · ★★ · Freigabe

## 🗂️ Durch die Neuausrichtung herabgestuft (2026-07-17)

> Nicht gelöscht, sondern mit Begründung geparkt — Nachvollziehbarkeit.

- **Geräte-ROI-Auswertung** (war ROADMAP P2.2): trägt im kleinen Rest-Inventar nicht mehr;
  **gestrichen** und in der ROADMAP durch „Lieferanten- & Margen-Auswertung" ersetzt.
- **„Meistgebuchte Geräte"** in den Auswertungen: verliert an Bedeutung, bleibt aber
  bestehen (kein Rückbau nötig).
- **Weitere Investitionen in Barcode/Scan/DGUV:** eingefroren auf Bestandspflege-Niveau —
  bleiben voll funktionsfähig fürs Rest-Inventar, werden aber nicht mehr ausgebaut.

## 🎨 Design-Update (läuft — Freigabe erteilt)

Richtung: dunkles Premium-Theme, Indigo-Akzent, modernere Komponenten + dezente Animationen
(Mockups abgestimmt). Token-first, Seite für Seite.

- [x] Akzent global auf Indigo (`tailwind.config.js`).
- [x] **Überblick/Dashboard** neu: Kennzahlen-Karten (Hochzähl-Effekt), Auslastungs-Ring,
      Gerätestatus-Balken, „Neue Anfragen"-Panel, gestraffte Job-/Aufgaben-Zeilen.
- [x] **Jobs** neu: Status-Chips (alle 8 Status + Zähler) statt Dropdown, Karten mit
      farbigem Akzentbalken, animiertem Packfortschritt (aus echten Packlisten-Mengen),
      Avatar-Gruppen für zugewiesene Nutzer, farbcodierte Status-Pills.
- [x] **Kunden** (Alle-Kunden-Ansicht) neu: Zeilen-Karten mit Initialen-Avatar (Stammkunden
      abgesetzt), Stammkunden-Badge, Kontakt-Icons, farbigem Quelle-Badge, Job-Anzahl.
- [x] **Job-Detail** neu: Status-Badge im Titel, Status-Auswahl als vertikale
      Pfeil-Kette (Anfrage → … → Abgeschlossen, farbcodiert), Storniert separat
      darunter; Zugewiesene-Nutzer als Avatar-Chips (Initialen).
- [x] **Basis-Komponente Tabs** (2026-07-03): geteilter Segment-Umschalter
      (`ui/Tabs.tsx`, Icon/Zähler/sm-Größe/stretch) ersetzt 5 handgebaute Kopien
      (Kunden, Website-Anfragen, Rechnungen, Admin-Bereichsrechte, Stammkunde).
      Button/Card/Dialog/Input waren bereits zentral.
- [x] **Inventar** (2026-07-03): Sets als **Foto-/Icon-Grid** oben (immer sichtbar,
      mit Live-Buchbarkeit „N× buchbar" aus Bestand−defekt−draußen), Geräte als
      **Karten-Liste** im Jobs-Look (Kategoriefarbe als Akzentbalken, Foto/Icon-Kachel,
      ETM-Code, Verfügbarkeits-Badge), Kennzahlen mit farbiger Zahl + Mini-Balken,
      kompakte Sortier-Leiste statt Tabellenkopf. Packlisten-Auswahl-Modus
      funktioniert unverändert (verifiziert: Gerät + Set buchen, Mengen-Stepper).
- [x] **Stufe 3 (Angebote-Teil, 2026-07-04):** OffersPage an InvoicesPage angeglichen —
      und darüber hinaus (Kennzahlen, Jahr-Archiv, Gruppen; siehe „Listen- &
      Archiv-Ansichten"). Offen bleibt der Aufgaben-Teil (TasksPage-Buckets als
      Premium-Karten).
- [ ] **Stufe 3 (Rest):** TasksPage-Buckets als Premium-Karten.
- [ ] **Stufe 4:** Kalender-Politur (Ansichts-Umschalter auf `Tabs`, Toolbar/
      Termin-Karten angleichen; Kalenderlogik unberührt).
- [ ] Optional: evtl. Light-Mode-Toggle (bisher bewusst dark-only).

## ✅ Kürzlich umgesetzt (Verlauf)

- **Doku-Aufräumung + Arbeitsweise-Regel** (2026-07-18): `HANDOVER.md` (überholter
  Einmal-Übergabetext) und `PLAN-PROFI-ANSICHTEN.md` (als „UMGESETZT" markiert) nach
  `docs/archiv/` verschoben (nicht gelöscht, Historie bleibt). Neue Doku-Landkarte in
  `CLAUDE.md`: Tabelle sagt jetzt explizit, **wann welche Datei aktualisiert** wird, plus
  klare Session-Start-Lesereihenfolge. Neu: `ARBEITSWEISE.md` — Tills Fahrplan für
  effektives Arbeiten mit Claude (Kontext-Start, Ziel statt Lösung, Mockup-first,
  Session-Hygiene, Modellwahl) + welcher Skill wann greift.
- **Neuausrichtung D4 — Auto-Archivierung erzeugter PDFs** (2026-07-18): beim Stellen einer
  Rechnung bzw. beim Senden eines Angebots landet das PDF automatisch dauerhaft im
  Dokumente-Archiv — sprechend benannt (`RE-2026-0001_Milad.pdf`, `AN-2026-9001_Milad.pdf`),
  mit `auto`-Badge, Kategorie Rechnung/Angebot. Idempotent (kein Doppel-Archiv), best-effort
  (der Beleg bleibt gültig, falls das Archiv scheitert). Namens-Konvention als getestete
  `lib/documentNaming.ts`. Aus RLS-Gründen am eigenen Beleg-Vorgang abgelegt, in der
  Gesamtsicht aber auf den Job verlinkt. Damit ist Block A (Dokumente) komplett. Voll
  bewiesen (Browser + DB, Testdaten restlos entfernt).
- **Neuausrichtung D3 — zentrale Seite „Dokumente"** (2026-07-18): neue Seite `/dokumente`
  (bereichslos, RLS filtert zeilenweise) nach dem Listen-Rezept — Kennzahlen-Kopf,
  Kategorie-Spalte mit Zählern, Suche über Titel/Vorgang, Jahr-Filter, Monatsgruppen mit
  Größen-Zwischensumme, Sprung zum Vorgang. `useAllDocuments` löst Job-/Kundennamen je
  Zeile auf; `categoryMeta.tsx` teilt die Kategorie-Optik mit der Karte. Voll bewiesen.
- **Neuausrichtung D2 — Dokumente am Vorgang** (2026-07-18): wiederverwendbare
  `DocumentsCard` (Tabellen-Optik mit farbigen Kategorie-Kacheln nach dem freigegebenen
  Zielbild) an Job- und Kunden-Detailseite: Upload per Knopf/Drag-and-drop mit Dialog,
  Öffnen über kurzlebige signierte URLs (privater Bucket), Löschen mit Bestätigung,
  Skeleton-/Leer-/Fehler-Zustände, Schreibrechte je Bereich. `formatBytes` in
  `lib/format.ts` (+Tests). Voll bewiesen (Netzwerk-Kette, 3 Viewports, DB-Gegenprobe).
- **Neuausrichtung D1 — Dokumenten-Fundament** (2026-07-17, Migration 0038): privater
  Bucket `documents` (nie public) + Tabelle mit polymorphem Vorgangs-Bezug
  (`entity_type`/`entity_id`) und Kategorien; Helfer `can_see_document`/`can_edit_document`
  koppeln die Sichtbarkeit an die bestehenden Bereichs-Rechte, Storage-Policies binden das
  Signieren an die Dokument-Sichtbarkeit. Lokal + Cloud verifiziert (Bucket privat, RLS
  aktiv, anon gesperrt, Deny/Allow je Bereich). Nächster Schritt: D2 (DocumentsCard + Upload).
- **Automatisches DB-Backup** (2026-07-17, ROADMAP P0.1): geplanter GitHub-Action
  `db-backup.yml` sichert die Cloud-DB täglich als Artefakt (Rollen/Schema/Daten, 90 Tage
  Rotation), „ruhig by default". Restore-Weg in DEPLOY.md. Stufe 2 (Storage-Dateien) offen.
- **Claude-Automationen** (2026-07-17): Hooks (Migrations-Wächter für RLS/GRANT/Nummer/
  ENUM-Falle, Service-Role-Sperre im Frontend) + Subagent `migrations-pruefer` + `find-skills`.

- **Listen- & Archiv-Ansichten** (2026-07-04): Angebote und Rechnungen nach dem Vorbild
  professioneller Branchen-Software geordnet — Kennzahlen-Kopf (`SummaryStats`),
  Status-Tabs mit Zählern, Jahr-Umschalter fürs Archiv (`YearFilter`), ein-/ausklappbare
  Monats- oder Kunden-Gruppen mit Zwischensummen (`lib/listGrouping.ts`, getestet),
  CSV-Export der gefilterten Sicht. Rechnungs-Drawer mit Verlaufs-Zeitstrahl
  (erstellt → gestellt → Zahlungen/Mahnungen → bezahlt/storniert;
  `lib/invoiceTimeline.ts`, getestet), verlinkbar über `/rechnungen?open=<id>`.
  Insel aufgelöst: Rechnungen erscheinen am Job (JobInvoicesCard) und am Kunden,
  Angebote zeigen „→ RE-…", Kunde/Job sind aus den Listen heraus verlinkt.

- **Auswertungen** (2026-07-04): neue Seite (Bereich `angebote`, Sidebar-Eintrag) mit
  Finanz-KPIs (Jahresumsatz gestellt brutto/netto, Zahlungseingang, aktuell offen,
  überfällig), Umsatz-je-Monat-Diagramm (gestellt vs. eingegangen, 12 Monate), Jobs je
  Monat + Status-Verteilung, Top-Kunden nach gestelltem Umsatz und meistgebuchte Geräte
  nach Gerätetagen (Stück × Jobdauer) aus den Packlisten. Reines Frontend — Aggregation
  in `lib/reports.ts` (Vitest-getestet), Datenquellen über die bestehenden Hooks, RLS
  bestimmt die Sichtbarkeit.

- **Rechnungen: Mahnwesen** (2026-07-04, Migration 0037): drei Stufen (Zahlungserinnerung,
  1. Mahnung, 2./letzte Mahnung) per E-Mail über Resend. Edge Function `send-dunning`
  (JWT-geschützt + `can_edit_area('angebote')`-Prüfung) baut die Mail serverseitig, der
  Dialog zeigt IMMER erst die Vorschau (Empfänger/Betreff/Text), bevor gesendet wird.
  Versandprotokoll `invoice_dunnings` (nur serverseitig beschreibbar; Unique je
  Rechnung+Stufe verhindert Doppelversand). „Mahnen"-Button bei überfälligen Rechnungen,
  Mahnstufen-Hinweis unterm Status-Badge. Benötigt Secret `RESEND_API_KEY`; die Function
  muss einmal deployt werden (`supabase functions deploy send-dunning`).

- **Rechnungswesen** (2026-07-02, Migration 0036): Entwurf→Stellen-Workflow mit lückenloser
  Jahres-Nummerierung (RE-2026-0001, …) per DB-Funktion `issue_invoice` + Advisory-Lock
  (parallel-sicher getestet). Gestellte Rechnungen unlöschbar & nummern-fixiert (Trigger,
  GoBD) — Korrektur per Storno. Teilzahlungen; Status gestellt/teilbezahlt/überfällig/
  bezahlt wird aus Zahlungen + Fälligkeit abgeleitet (kein Cron). Adress-Snapshot beim
  Stellen. Eigene Seite „Rechnungen" (Filter-Chips, offene Summe), PDF mit Leistungs-
  datum/USt/Zahlungsziel/Teilzahlungs-Ausweis, „Zu Rechnung" auf der Angebotsseite.
  Rechte: Bereich `angebote`.

- **Verfügbarkeits-Engine** (2026-07-02): zentrales Modul `lib/availability.ts` (getestet) —
  frei = Bestand − defekt − fremdgebucht über zeitraum-überlappende Jobs in bindenden
  Status. Packlisten-Planung warnt pro Posten („Nur N von M im Zeitraum frei") inkl.
  verlinkter Verursacher-Jobs; Geräte-Picker zeigt „N im Job-Zeitraum frei". Bugfix:
  Papierkorb-Jobs binden keinen Bestand mehr.

- **Test-Fundament** (2026-07-02): Vitest (46 Unit-Tests für Domänenlogik) + CI-Workflow
  (tsc + ESLint + Tests + Build bei jedem Push/PR). ESLint-Altlasten bereinigt.

- **Website-Anfragen vereinfacht + Auto-Job** (2026-07-01): Status jetzt nur noch
  Neu / Akzeptiert / Verworfen (Migration 0035). „Akzeptieren" legt automatisch Kunde
  (mit Dubletten-Check) **und** Job (Status „Anfrage", Zeitraum/Nachricht übernommen)
  an und springt in den Job. Ansicht im Premium-Look neu (Status-Akzentbalken, Avatar,
  Kontakt-Chips). Anfragen-Pipeline-Tab entfernt, „Kunden" → „Anfragen / Kunden" umbenannt.
- **Manuelle Datensicherung** (2026-07-01): in der Verwaltung (Admin + Verwaltung) zwei
  Buttons — „Komplettes Backup" und „Nur Inventar" — laden die Daten als JSON herunter
  (client-seitig über die RLS-Data-API, kein Server/Secret nötig). `apps/web/src/lib/backup.ts`.
- **Job-Notizen editierbar** (2026-07-01): Freitext-Feld „Notizen / weitere Infos" im
  Erstell-Dialog und auf der Job-Detailseite (dort direkt bearbeitbar). Übernimmt u.a. die
  Nachricht aus einer Website-Anfrage.

- **Job anlegen: stiller Abbruch behoben** (2026-07-01): Fehlten Titel oder Zeitraum, brach
  das Formular bisher komplett ohne Rückmeldung ab ("nichts passiert"). Jetzt Toast-Hinweis
  ("Bitte einen Titel eingeben." / "Bitte einen Zeitraum festlegen.") plus Fehler-Toast bei
  fehlgeschlagener Anlage. Mini-Kalender im Job-Dialog überarbeitet: wird nur noch beim
  Auswählen des Zeitraums eingeblendet und dient direkt selbst als Datumsauswahl (Punkte
  für bereits geplante Jobs), statt einem redundanten zweiten, punktlosen Kalender daneben
  (neue Komponente `JobDateRangePicker`, `JobsMiniCalendar` jetzt klickbar).

- **Job-Status-Workflow erweitert** (2026-06-30, Migration 0034): neue Status `planung`,
  `packen`, `rueckgabe` zwischen `bestaetigt`/`laeuft`/`abgeschlossen` eingefügt
  (Reihenfolge: Anfrage → Bestätigt → Planung → Packen → Läuft → Rückgabe → Abgeschlossen,
  Storniert weiterhin jederzeit). Packliste auf `JobDetailPage` folgt jetzt direkt dem
  Status statt manuellem Stufen-Umschalter: Planung = Geräte zusammenstellen/Mengen
  anpassen/entfernen; Packen + Läuft = Ausgabe-Stufe (scannen/ausgeben), in Läuft weiterhin
  Geräte ergänzbar; Rückgabe = Rücknahme-Stufe; davor/danach nur Lese-Ansicht. Eigene
  Job-Statusfarben in Tailwind, Geräte-Verfügbarkeits-/„aktuell draußen"-Abfragen
  berücksichtigen die neuen Zwischenstatus als aktiv/blockierend.

- Quick Wins (2026-06-29): ESLint-Warnung in `useJobs.ts` behoben; globaler Badge mit Anzahl
  neuer Website-Anfragen am „Kunden"-Eintrag der Sidebar; „Wiederherstellen" für verworfene
  Anfragen im Website-Anfragen-Tab.
- Website-Kontaktformular → System: Tabelle `website_leads`, öffentliche Edge Function `public-lead`,
  Tab „Website-Anfragen" (Filter + Zähler), „Zu Kunde/Job machen" mit Dubletten-Erkennung,
  Spam-Härtung (Honeypot + IP-Rate-Limit), optionale E-Mail-Benachrichtigung (Resend, Zieladresse
  in den Firmendaten). Migrationen 0031–0033.
