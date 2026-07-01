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

- [ ] **Rechnungsstellung** — größter offener Baustein: Rechnung aus Job/Angebot, Status-Workflow
      (offen/bezahlt/überfällig), PDF. Dashboard verweist bereits darauf. · L · ★★★ · Freigabe
- [ ] **Globale Suche + Änderungsprotokoll** — projektweite Suche (Geräte/Jobs/Kunden/Angebote)
      und ein Audit-Log, wer wann was geändert hat. · L · ★★★ · Freigabe
- [ ] **Automatisierte Tests** — zumindest Smoke-Tests (Login, Packliste, Angebot, Lead-Annahme);
      aktuell keinerlei Tests. · M · ★★ · Freigabe
- [ ] **DB-Backups** der Cloud-DB (regelmäßiger `pg_dump`, z.B. via GitHub-Action) + „Backup
      erstellen"-Button für Admin/Verwaltung. Braucht vom Nutzer einen GitHub-PAT-Secret
      (`GH_DISPATCH_TOKEN`) — Anleitung wurde geliefert, noch nicht bestätigt/gesetzt. · M · ★★ · Freigabe
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
- [ ] Basis-Komponenten zentral nachziehen (Button, Card, Dialog, Tabs, Badge, Input).
- [ ] Weitere Seiten: Inventar, Kalender, Angebote, Aufgaben, Anfragen-Pipeline.
- [ ] Optional: Akzentfarbe final bestätigen, evtl. Light-Mode-Toggle.

## ✅ Kürzlich umgesetzt (Verlauf)

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
