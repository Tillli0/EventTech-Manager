# Ideen & Weiterentwicklung — EventTech-Manager

> **Wie das hier funktioniert:** „Weiterentwicklung" ist der **Standard bei jeder Anfrage**
> (siehe `CLAUDE.md`) — ein **`+` am Anfang schaltet sie aus** (dann nur die genannte Aufgabe).
> Im Normalfall setzt Claude **kleine, risikoarme** Verbesserungen selbst um (verifiziert,
> committet, gepusht), **schlägt Größeres erst vor**, pflegt diese Datei und **berichtet
> jedes Mal**, was passiert ist.
>
> Legende — **Aufwand** S/M/L · **Wirkung** ★–★★★ · **Auto** = Claude darf eigenständig
> umsetzen (klein/risikoarm) / **Freigabe** = vorher fragen.

## 🔧 Quick Wins (Auto — kann Claude eigenständig erledigen)

- [ ] **Leere-Zustände/Ladezustände** vereinheitlichen, wo noch nicht (Konsistenz-Pass). · S · ★ · Auto

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
- [ ] **Stufe 3:** Angebote + Aufgaben auf den neuen Stil (OffersPage an InvoicesPage
      angleichen mit Status-Filter-Tabs; TasksPage-Buckets als Premium-Karten).
- [ ] **Stufe 4:** Kalender-Politur (Ansichts-Umschalter auf `Tabs`, Toolbar/
      Termin-Karten angleichen; Kalenderlogik unberührt).
- [ ] Optional: evtl. Light-Mode-Toggle (bisher bewusst dark-only).

## ✅ Kürzlich umgesetzt (Verlauf)

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
