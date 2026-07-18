# PLAN — Zweite Säule: das Persönliche („Meine Zeiten")

> **Großes Vorhaben, wartet.** Stand: **2026-07-18** — konzipiert und freigegeben.
> **M1** wird im Rahmen von `PLAN-UI-NEUSCHNITT.md` **U4** vorgezogen (das Ebenen-Modell
> im Kalender braucht das DB-Fundament); **M2 geht vollständig in U4 auf**. M3–M6 folgen
> danach.
>
> `ROADMAP.md` sagt WOHIN, `CLAUDE.md` WIE, hier stehen die **Details**.

---

## 1. Warum es dieses Vorhaben gibt

Till ist **17**, hat noch zwei Schuljahre vor sich (Q1 ab Sommer 2026, Q2 bis Sommer 2028)
und arbeitet zusätzlich **angestellt** (minijob-ähnlich) bei einem großen
Veranstaltungstechnik-Betrieb in **Köln**. Die Software soll nicht nur die Firma verwalten,
sondern **ihn** — Schule, Anstellung und Selbständigkeit in *einer* Zeitachse.

**Der Schmerzpunkt** ist eine Frage, die das System heute nicht beantworten kann:

> „Kann ich diesen Job überhaupt annehmen — bin ich da frei, darf ich das arbeiten,
> und was bringt es mir gegenüber der Schicht in Köln?"

**Tills ausdrückliche Ergänzung:** Es ist ein Manager **für ihn**, muss aber die
**Jobverwaltung für andere Accounts** mittragen. Jeder Nutzer bekommt seine persönliche
Ebene, und **seine Abwesenheiten wirken auf die Job-Planung** — ohne dass jemand sieht,
*warum* er nicht kann. Damit löst dieses Vorhaben **ROADMAP P4.1 (Personal-Konflikte)** mit.

**Warum eine eigene Säule:** Es gibt heute **keinerlei Personen-Verfügbarkeit** —
`lib/availability.ts` kennt nur Geräte; `job_assignees` und `tasks.assigned_user_id` haben
keine Zeit- oder Stunden-Dimension. Das muss neu entstehen.

## 2. Die Trennlinie (Tills Korrektur, 2026-07-18)

Nicht „privat vs. Firma", sondern:

| | Sichtbar als Inhalt | Wirkt nur als Blocker |
|---|---|---|
| **Was** | Eigene Jobs · Köln-Schichten | Schule · Klausuren · Ferien |
| **Wo** | Startseite, Kalender-Ebene, Auswertung | Kalender-Ebene (gedämpft), Kollisionswarnung |

> Till: *„Die Schule soll eher einen ganz kleinen Teil belegen, nicht auf der Startseite.
> Eher das, was wirklich jobmäßig ist — das ist immer noch der Fokus."*

**Schule ist nie eine Karte.** Sie ist der stille Grund für eine Warnung.

## 3. Kern-Entscheidungen

### E-A · Sichtbarkeit: eigene Zeile statt Bereichsrecht ⚠️ bewusste Abweichung
Alle anderen Tabellen hängen an `has_area(...)` / `is_manager()`. **Hier nicht.** RLS lautet
strikt `user_id = auth.uid()` — **auch Admin und Verwaltung sehen fremde persönliche Daten
nicht.** Begründung: Klausurzeiten, Krankheit, Verdienst und Geburtsdatum sind **keine
Betriebsdaten**.

> **Diese Begründung gehört in den Migrations-Kommentarkopf**, sonst „repariert" eine
> spätere Session das vermeintlich fehlende `is_manager()` und öffnet damit alles.

Ein neuer `app_area`-Wert ist **nicht nötig**.

### E-B · Kein Navigationsplatz — „Meine Zeiten" im Nutzer-Menü
Stundenplan, Arbeitgeber und Verfügbarkeit werden im **Nutzer-Menü** (Avatar oben rechts)
gepflegt. Die *Wirkung* passiert auf der Startseite und im Kalender.
**Ersetzt die frühere Idee einer eigenen Seite `/mein-plan`** (Entscheidung K-B in
`PLAN-UI-NEUSCHNITT.md`) — ein eigener Nav-Eintrag wäre genau das „Draufsatteln", das
vermieden werden soll.

### E-C · Geburtsdatum & Stundensatz gehören NICHT an `profiles`
`profiles` ist für **alle** `authenticated` lesbar (Migration `0012`). Deshalb eigene
Tabelle `personal_settings` mit Eigen-Zeilen-RLS. Dieselbe Falle beschreibt
`PLAN-NEUAUSRICHTUNG.md` §7.4 bereits für `job_costs`.

### E-D · Wiederkehrendes getrennt von Einmaligem
Statt einer generischen RRULE-Maschine zwei schlanke Tabellen:
- `personal_blocks` — **konkrete** Zeiträume (Klausur, Ferien, Urlaub, krank).
- `personal_recurring_blocks` — **wöchentliche Regel** (Wochentag + Uhrzeit + gültig
  von/bis) für Stundenplan und feste Schichtmuster.

Auflösung „Regel → Termine im Zeitraum" als **pure Funktion** `lib/personalSchedule.ts`
+ Test (Sommerzeit-Wechsel, Gültigkeitsgrenzen). **Kein Expandieren in der DB.**

### E-E · Angestellte Arbeit ist ein eigener Vorgangstyp, kein Job
Eine Köln-Schicht ist kein `job` (kein Kunde, kein Angebot, keine Packliste). Eigene
Tabelle `employment_shifts` + kleiner privater Arbeitgeber-Stamm `employers`. Wahrheit ist
`amount`, Komfort ist `hours × hourly_rate` — dasselbe Muster wie `job_costs` (E6).

### E-F · Regeln warnen, sie verbieten nicht
Jugendarbeitsschutz (max. 8 h/Tag, 40 h/Woche, nicht nach 20 Uhr, Ruhezeiten) und die
Verdienstgrenze als pure Funktion `lib/workingTimeRules.ts` + Test → **Hinweise, nie
Speicher-Blockaden**. Grenzwerte in `personal_settings`, **nicht hartcodiert** (Gesetze
ändern sich; mit 18 fällt das halbe Regelwerk weg).
**UI-Text: Orientierungshilfe, keine Rechtsberatung.**

### E-G · Team-Verfügbarkeit: nur Zeiträume, nie Gründe
`security definer`-Funktion `personal_busy_ranges(from, to)` liefert **nur**
`(user_id, start_at, end_at)` — **kein** Titel, **keine** Kategorie, **keine** Notiz.
Zugriff nur mit `has_area('jobs')`. Die einzige Brücke zwischen privat und betrieblich,
**absichtlich schmal**.

### E-H · Externe: Rechte bleiben einstellbar
Tills Vorgabe: alles als Admin einstellbar. Externe sollen **ihre Jobs + Aufgaben sehen**,
**eigene Verfügbarkeit eintragen** und **Dokumente zu ihrem Job** sehen — keine
Stundenerfassung (bewusst nicht gewählt).

## 4. Etappen

**M1 — Fundament** *(1 Migration; wird in U4 vorgezogen)*
`personal_settings` (PK = `user_id`), `personal_blocks`, `personal_recurring_blocks`;
RLS strikt `user_id = auth.uid()`, explizite GRANTs (`authenticated`, `service_role`,
**nie** `anon`), `set_updated_at`-Trigger, FK-Indizes, `notify pgrst, 'reload schema'`.
Vorlage: `0012_auth_roles_and_access.sql` — **ohne** `has_area`/`is_manager` (E-A), mit
Begründung im Kopf. `lib/personalSchedule.ts` + Test. „Meine Zeiten" im Nutzer-Menü (E-B).
**Vor der Migration:** Agent `migrations-pruefer`.
*Beweis:* psql — zweiter Nutzer sieht 0 Zeilen, **auch als Admin**; `anon` leer.

**M2 — Zeitachse** → **geht vollständig in `PLAN-UI-NEUSCHNITT.md` U4 auf.**

**M3 — Angestellte Arbeit** *(1 Migration)*
`employers` + `employment_shifts` (start/end, Pause, `hourly_rate`, `amount`, Status
geplant/gearbeitet/abgerechnet). `lib/employmentTotals.ts` + Test (Netto-Arbeitszeit,
Monatssumme). Ansicht nach dem **Listen-Rezept** (`SummaryStats`, `Tabs`, `YearFilter`,
Monatsgruppen über `lib/listGrouping.ts`, CSV).
*Beweis:* Schicht mit Pause → Stunden/Verdienst stimmen; Monatssumme über zwei Monate.

**M4 — Regel-Wächter** *(keine Migration)*
`lib/workingTimeRules.ts` + Test (E-F). Hinweise im Schicht-Dialog und in der
Monatsübersicht, Ampel-Optik.
*Beweis:* Vitest deckt jede Regel ab; 9-Stunden-Schicht → Hinweis, **Speichern bleibt
möglich**.

**M5 — Team-Verfügbarkeit** *(1 Migration — löst ROADMAP P4.1)*
`personal_busy_ranges` (E-G). Warnung bei Job-Zuweisung: „Max ist am 14.09. nicht
verfügbar" — **ohne Grund**. Ergänzend Überlappung mit anderen Jobs.
*Beweis:* Nutzer B trägt Block ein → Nutzer A sieht die Warnung, aber **weder Titel noch
Kategorie**; psql-Gegenprobe auf die Funktions-Rückgabe.

**M6 — Gesamtbild Geld & Zeit** *(keine Migration)*
`lib/personalReports.ts` + Test: Einkommen je Monat aus **beiden** Quellen (Minijob aus
`employment_shifts`, selbständig aus gestellten Rechnungen / `lib/jobCosting.ts`), Stunden
je Kategorie.
**Abhängigkeit:** sinnvoll erst **nach E7** (Kalkulation) — sonst fehlt die selbständige
Erlösseite.

## 5. Risiken

1. **Privatheits-Rückfall (größtes Risiko):** eine spätere Session „vereinheitlicht" die
   abweichende RLS aufs Hausmuster und öffnet Verdienst/Krankheitszeiten für Admins.
   → Begründung im Migrations-Kopf **und** in `CLAUDE.md` unter Domänen-Invarianten.
2. **`profiles`-Falle** (E-C) — niemals Geburtsdatum/Stundensatz dorthin.
3. **Kalender-Feed-Leck:** die Edge Function `calendar-feed` exportiert `calendar_entries`
   per Token-URL. **Persönliche Blöcke dürfen dort nicht hineinlaufen** → deshalb eigene
   Tabellen statt Erweiterung von `calendar_entries`.
4. **Zeitzonen/Sommerzeit:** Regeln als lokale Uhrzeit speichern, erst bei der Auflösung in
   `timestamptz` rechnen — Testfälle über die Zeitumstellung sind Pflicht.
5. **Rechtsdaten sind kein Rechtsrat** (E-F).
6. **GRANTs vergessen** → still leere Daten/403.
7. **Scope-Falle Schule:** kein Vertretungsplan-Import, keine Noten, keine Hausaufgaben —
   Schule ist **blockierte Zeit**, sonst wird daraus ein zweites Produkt.

## 6. Was bewusst NICHT enthalten ist

- Kein Schul-Import, keine Noten, keine Hausaufgaben.
- Keine Lohnabrechnung (macht der Arbeitgeber) — hier nur **Erfassung**.
- Keine Steuer-Logik.
- Keine Urlaubsanträge/Freigabe-Workflows zwischen Nutzern.
- **Ferne Zukunft (nicht Teil dieses Plans):** „wer macht was im Ablauf" — Max holt bei
  Beuchel ab, Bela baut auf. Die Struktur hält sich das offen (K-G in
  `PLAN-UI-NEUSCHNITT.md`), gebaut wird es nicht.

## 7. Verlauf

- **2026-07-18:** Vorhaben konzipiert (Tills Kontext: 17, Q1/Q2 bis 2028, Minijob Köln).
  Entscheidungen E-A…E-H festgelegt; Trennlinie „Arbeit sichtbar / Schule blockiert" nach
  Tills Korrektur geschärft; eigener Nav-Eintrag zugunsten „Meine Zeiten" im Nutzer-Menü
  verworfen. M1 nach U4 vorgezogen, M2 in U4 aufgegangen.
