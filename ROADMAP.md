# ROADMAP — EventTech-Manager

> **Der Nordstern für alle Sessions.** Bei jeder Arbeit gilt: diese Datei sagt WOHIN und
> in welcher Reihenfolge; `CLAUDE.md` sagt WIE (Regeln/Rituale); `IDEAS.md` hält den
> Kleinkram und den Verlauf; `PLAN-*.md` vertiefen einzelne große Vorhaben.
> Nach jedem erledigten Baustein: Haken setzen + Datum. Stand: **2026-07-17**.

---

## 1. Das Langzeit-Ziel

EventTech-Manager ist das **Betriebssystem von Tills Event-Dienstleistung** — ein
selbst kontrolliertes System, über das das gesamte Geschäft läuft. Till **plant und
setzt Veranstaltungen um**; die Technik dafür wird überwiegend bei Partner-Verleihern
**angemietet**, ein kleines Rest-Inventar (Mischpult, BT-Box, Kleinkram) bleibt im Haus.
Der rote Faden:

**Anfrage → Angebot → Job (Material: eigen + angemietet · Personal · Fremdgewerke ·
Dokumente) → Bestellungen an Verleiher → Durchführung → Rechnung → Zahlung →
Nachkalkulation**

„Angekommen" sind wir, wenn fünf Sätze dauerhaft wahr sind:

1. **„Alles läuft hier drin."** Kein Excel, keine Zettel, kein „das steht noch in
   WhatsApp" — jeder Vorgang hat seinen Platz und ist am Job/Kunden auffindbar.
2. **„Jedes Papier hat seinen Platz."** Genehmigungen, Baupläne, Verleiher-Rechnungen,
   Verträge und erzeugte Dokumente liegen geordnet an ihrem Vorgang und an einem
   zentralen Ort — auffindbar, öffenbar, nichts geht verloren.
3. **„Ich weiß bei jedem Job, was ich daran verdiene."** Deckungsbeitrag inkl. Anmiet-,
   Personal- und sonstiger Kosten — die Kernzahl der Dienstleistung.
4. **„Es kann nichts verloren gehen."** Automatische Backups inkl. Dateien, ein real
   geprobter Wiederherstellungs-Weg, rechtssichere Dokumente (GoBD).
5. **„Es baut sich sicher weiter."** Muster, Invarianten und Rituale sind so dokumentiert
   und durch Automationen abgesichert, dass auch schwächere Modelle gefahrlos
   weiterentwickeln können — Qualität hängt an der Maschine, nicht am Modell.

Maßstab für alles Sichtbare: **professionelle Branchen-Software** — Rentman/Current RMS
(Verleih-Workflow inkl. **Subrental/Purchase-Order**), lexoffice/sevDesk (Rechnungswesen/
GoBD, **Dokumenten-Ablage**). Keine nackten Listen, keine Insel-Daten, keine
UI-only-„Sicherheit".

## 2. Wo wir stehen (ehrliche Bestandsaufnahme)

**Geschäftsmodell-Wende (2026-07-17):** Vom Technik-**Verleih** (eigener Bestand wird
vermietet) zum **Event-Dienstleister** (planen + umsetzen, Technik anmieten). Das
verschiebt den Schwerpunkt der Software vom Bestand zum Projekt; das bestehende Fundament
(Rechnungswesen, Angebote, Jobs, RLS, Kalender) bleibt voll wertvoll, neu hinzu kommen
**Dokumenten-Ablage**, **Anmietung** (Verleih-Partner, Anmiet-Vorgänge) und die
**Kalkulation** (Deckungsbeitrag je Job). Details: `PLAN-NEUAUSRICHTUNG.md`.

**Fertig und live** (Cloudflare + Supabase Cloud, Stand 2026-07-07):

- Inventar (Geräte + Sets mit Live-Buchbarkeit, Barcodes, Fotos, DGUV-Erinnerung),
  Kunden/Anfragen inkl. Website-Lead-Formular, Jobs mit Packliste/Personal/Zeitplan,
  Angebote mit PDF, Kalender, Aufgaben, Rollen/Bereichsrechte (RLS).
- **Rechnungswesen** (GoBD): lückenlose Nummern (Advisory-Lock, parallel-getestet),
  Storno statt Löschen, Teilzahlungen, abgeleiteter Status, PDF mit Pflichtangaben.
- **Verfügbarkeits-Engine**: Doppelbuchungs-Warnung in der Packliste inkl.
  Verursacher-Jobs; Papierkorb bindet keinen Bestand.
- **Profi-Listen** (Angebote/Rechnungen): Kennzahlen-Kopf, Status-Tabs, Jahres-Archiv,
  Monats-/Kundengruppen mit Zwischensummen, Detail-Drawer mit Zeitstrahl, CSV;
  Rechnungen am Job und am Kunden sichtbar. **Auswertungen**-Seite (Umsatz, offen/
  überfällig, Monatscharts, Top-Kunden).
- **Mahnwesen** gebaut, aber bewusst **ruhig**: Edge Function `send-dunning` ist nicht
  deployt, kein `RESEND_API_KEY` gesetzt → es geht keine Mail raus.
- **Fundament**: Vitest (70+ Tests) + CI (tsc/Lint/Tests/Build) + automatische
  DB-Migration in die Cloud; Wissens-Basis (CLAUDE.md × 3, 4 Skills, Plan-Dokumente).

**Bekannte Lücken:** Backups nur manuell (JSON-Knopf, ohne Storage-Dateien, ohne
Restore-Weg) · **keine geordnete Dokumenten-Ablage** (nur Foto-/Geräte-Datei-Inseln;
Genehmigungen, Baupläne, Verleiher-Rechnungen, Verträge haben keinen Ort; erzeugte PDFs
werden nur heruntergeladen) · **keine Anmietung** (kein Verleih-Partner-Stamm, keine
Anmiet-Vorgänge, Verfügbarkeit kennt nur Eigenbestand) · **keine Kosten-/Margensicht**
(Deckungsbeitrag je Job) · kein E-Mail-Versand von Angeboten/Rechnungen · keine Personal-
Konfliktprüfung · keine globale Suche / kein Audit-Log · Kalender noch im alten Design ·
kein E2E-Test.

## 3. Arbeitsweise (dauerhaft, modell-unabhängig)

Der Bogen aus Skill `grosses-feature`:
**verstehen** (bei Vagem 2–4 konkrete Optionen anbieten, nie raten) → **recherchieren**
(wie lösen es die Profi-Tools?) → **zeigen** (visuelle Vorschau vor Umbau) → **planen**
(`PLAN-*.md` im Repo, offene Entscheidungen markiert) → **Freigabe** → **bauen in
Etappen**, jede mit vollem Beweis (Skill `feature-fertigstellen`) → **Doku nachziehen**.

Eiserne Prinzipien (Langform in `CLAUDE.md`): Backend ist die Wahrheit · beweisen statt
behaupten · wiederverwenden vor neubauen · nach außen Wirkendes standardmäßig ruhig +
ausdrückliche Freigabe · kleine Commits, nie rot pushen.

## 4. Modell-Strategie: Was macht wer?

Praktische Modellwahl nach Aufgabengröße: siehe `ARBEITSWEISE.md`. Projektspezifisch
zusätzlich: **starkes Modell für „einmal schwer, für immer wertvoll"** (Phase 0, fertige
`PLAN-*.md`-Entwürfe für harte Features) und als eiserne Faustregel — unabhängig von der
sonstigen Aufgabengröße: **kostet ein Fehler Geld, Recht oder Daten** (Nummernkreise, RLS,
Backups, Löschlogik) → stärkstes verfügbares Modell + DB-seitige Absicherung + Tests.

## 5. Die Phasen

> Die Neuausrichtung (2026-07-17) ist als **Phase 1 (Dokumente)** und **Phase 2
> (Anmietung & Kalkulation)** eingehängt; Details in `PLAN-NEUAUSRICHTUNG.md`. Der alte
> Geld-Kreislauf/Operative-Intelligenz/Reife rückt entsprechend nach hinten. **Phase 0
> bleibt unverändert** und behält Vorrang beim Fundament.

### Phase 0 — Das Fundament unzerstörbar machen  ⟵ **JETZT (P0.1 zuerst)**

*Ziel: Datenverlust unmöglich, Regressionen werden automatisch gefangen.*

> **Steuerung seit 2026-07-18:** Diese Phase wird über `PLAN-V1-ABSICHERN.md` abgearbeitet
> (Etappen A1–A4) — dort stehen der geprüfte Ist-Zustand mit Belegen und die Details.

- [x] **P0.1 Backup automatisch — Stufe 1 (Datenbank)** (2026-07-18). *Beleg:* Artefakt
      `db-backup-2026-07-18_0534` (26 kB) ist per Zeitplan **ohne menschliches Zutun**
      entstanden; Workflow `.github/workflows/db-backup.yml`, Aufbewahrung 90 Tage.
      ⚠️ **Stufe 2 (Storage-Dateien inkl. `documents`-Bucket) fehlt noch** → Etappe **A2**.
      Solange gilt: „es kann nichts verloren gehen" ist **noch nicht** wahr.
      ⚠️ **Falle:** Der Workflow läuft **grün durch, wenn Secrets fehlen** — grün beweist
      nichts, nur ein vorhandenes Artefakt tut das.
- [x] **P0.2 Restore geprobt** (2026-07-18, Etappe A1). Mit **echtem Cloud-Dump** in eine
      separate lokale DB zurückgespielt; Daten **und** Schutzmechanismen kamen vollständig
      zurück (31 Tabellen mit RLS, 113 Policies, 46 Funktionen inkl. `issue_invoice()`).
      **Wichtigste Erkenntnis:** Ziel muss ein **frisches Supabase-Projekt** sein, keine
      nackte Datenbank — der bis dahin dokumentierte Weg scheiterte mit 109 Fehlern.
      Korrigiert in `DEPLOY.md`. *(Nicht getestet: App gegen die restaurierte DB — Beweis
      liegt auf DB-Ebene.)*
- [ ] **P0.3 CI-Guardrails:** harte Checks, die den Build brechen bei: Service-Role-Key
      im Frontend-Code · neuer Tabelle ohne RLS/GRANT · Migrations-Nummern-Duplikat.
      *Fertig, wenn:* ein absichtlicher Verstoß im Test-Branch rot wird.
      *(Teilweise vorhanden: Hooks als Migrations-Wächter seit 2026-07-17.)*
- [x] **P0.4 E2E-Netz** (2026-07-19, Etappe A3): Playwright mit **15 Tests** (~30 s) —
      Seiten-Smoke über alle 11 Hauptseiten (kein weißer Bildschirm, keine JS-Fehler),
      Navigation, Job-Durchstich (anlegen → öffnen → Papierkorb). **Mutationsprobe
      bestanden**: eine absichtlich kaputte Seite wird rot, alle anderen bleiben grün.
      *Bewusst ohne Rechnungsstellung* — gestellte Rechnungen sind per Trigger unlöschbar
      und verbrauchen eine Nummer aus dem lückenlosen Jahreskreis; ein Test dürfte das
      nicht bei jedem Lauf tun. ⚠️ In CI noch `continue-on-error` (ungetestet auf dem
      Runner) — nach dem ersten grünen Lauf zur Pflicht machen.
      *Offen bleibt:* zusätzliche Invarianten-Unit-Tests (Set-Auflösung, Mahnstufen,
      Storno-Semantik).
- [ ] **P0.5 Wochen-Report (Automation):** wöchentliche Zusammenfassung „überfällige
      Rechnungen + fällige DGUV-Prüfungen + anstehende Jobs" (E-Mail oder Dashboard-Kachel).

### Phase 1 — Dokumente & Ablage  *(Neuausrichtung, Block A)*

*Ziel: „Jedes Papier hat seinen Platz." Alle Dateien geordnet am Vorgang und an einem
zentralen Ort. Details + Schema: `PLAN-NEUAUSRICHTUNG.md` (D1–D4).*

- [x] **P1.1 (D1) Dokumenten-Fundament:** privater Bucket `documents` + Tabelle mit
      Vorgangs-Bezug + `can_see_document()`-RLS (signierte URLs, nie public). (2026-07-17,
      Migr. 0038, lokal + Cloud verifiziert)
- [x] **P1.2 (D2) Dokumente am Vorgang:** wiederverwendbare `DocumentsCard` (Upload,
      farbige Kategorien, öffnen/löschen) an Job und Kunde. (2026-07-18, voll bewiesen)
- [x] **P1.3 (D3) Zentrale Seite „Dokumente":** Kategorie-Spalte, Suche, Jahr-Filter,
      Monats-Gruppen, Vorgang-Verlinkung. (2026-07-18, voll bewiesen)
- [x] **P1.4 (D4) Auto-Archivierung:** Rechnungs-/Angebots-PDF beim Stellen/Senden
      automatisch sprechend benannt ablegen (`RE-2026-0001_<Kunde>.pdf`). (2026-07-18,
      voll bewiesen — damit ist **Block A komplett**.)

### Phase 1.5 — UI-Neuschnitt  ⟵ **nach Phase 0, vor Phase 2**

*Ziel: Die App wird von „gewachsen" auf „gestaltet" umgestellt — bevor Anmietung und
Kalkulation zusätzliche Karten und Seiten hinzufügen. Details: `PLAN-UI-NEUSCHNITT.md`.*

Auslöser: Tills Beobachtung „wir haben immer nur draufgesattelt", bestätigt durch
`docs/UI-REVIEW-2026-07-18.md` (dasselbe UI-Bedürfnis 4–5-mal unabhängig gelöst).

- [ ] **P1.5.1 (U1) Mockup des Gesamtkonzepts** — Navigation, Startseite in drei Rollen,
      Job-Abschnitte, Dokumente-Ordner. Till entscheidet danach das Standard-Theme.
- [ ] **P1.5.2 (U2) Theme-Fundament:** CSS-Variablen statt fester Hex-Werte, Paletten
      Creme · Weiß+Indigo · Dark umschaltbar; **eine** Farb-Registry statt fünf Mappings;
      Kontrast auf hellem Grund nachgeschärft.
- [ ] **P1.5.3 (U3) Startseite „Nächster Einsatz" + neue Navigation** — rollen-adaptiv,
      damit auch Externe einen sinnvollen Einstieg haben. **Erledigt zugleich P2.8 (E8).**
- [ ] **P1.5.4 (U4) Kalender als Ebenen-Modell** — Firmenjobs · eigene Einsätze · Köln ·
      Schule; zieht **M1** aus `PLAN-MEIN-PLAN.md` vor.
- [ ] **P1.5.5 (U5) Dokumente als Job-Ordner** (Tills Wunsch: nach Jobs sortieren +
      Ordnerstruktur).
- [ ] **P1.5.6 (U6) Job-Detailseite in Abschnitte** — Voraussetzung dafür, dass Block B
      ohne Chaos einziehen kann.

### Phase 2 — Anmietung & Kalkulation  *(Neuausrichtung, Block B)*

*Ziel: Technik bei Verleihern anmieten (Vorgänge mit Status + Bestell-Dokument), Engpässe
in der Packliste decken, je Job den Deckungsbeitrag kennen. Details: `PLAN-NEUAUSRICHTUNG.md`
(E1–E8).*

- [ ] **P2.1 (E1) Bereich `anmietung` + Verleih-Partner** (`suppliers`) + Seite `/anmietung`.
- [ ] **P2.2 (E2) Anmiet-Vorgänge am Job** (`subrentals` + Positionen, Status-Kette).
- [ ] **P2.3 (E3) Verfügbarkeits-Zugänge** (angemietete Technik deckt Engpässe;
      „Fehlmenge anmieten").
- [ ] **P2.4 (E4) Bestell-PDF** an den Verleiher (AM-Nummern).
- [ ] **P2.5 (E5) Bestell-Mail** an den Verleiher (Edge Function, „ruhig by default",
      Deploy nur nach Freigabe).
- [ ] **P2.6 (E6) Kosten am Job** (`job_costs`: Personal mit Stunden×Satz, Transport,
      Fremdgewerke).
- [ ] **P2.7 (E7) Kalkulation** (Deckungsbeitrag je Job, Marge in den Auswertungen).
- [ ] **P2.8 (E8) Dashboard & Navigation** neu gewichten (Fokus Anmietung, Inventar
      nach hinten). → **geht in P1.5.3 (U3) auf**, wird dort miterledigt.

### Phase 3 — Den Geld-Kreislauf schließen

*Ziel: Vom Angebot bis zur bezahlten Rechnung ohne Medienbruch.*

- [ ] **P3.1 Mahnwesen scharf schalten:** Resend-Key (Till setzt Secret), `send-dunning`
      deployen, Vorschau-Test, erste echte Mahnung. *(Nach-außen-wirkend: Freigabe!)*
- [ ] **P3.2 Angebote/Rechnungen per E-Mail** direkt an Kunden (PDF-Anhang,
      Versand-Protokoll wie beim Mahnwesen, „ruhig by default").
- [ ] **P3.3 Bestell-Mail an Verleiher scharf schalten** (E5-Scharfschaltung: Key +
      Function-Deploy nach Freigabe, erster echter Versand).
- [ ] **P3.4 Übergabe-/Rücknahmeprotokoll** mit Unterschrift (Canvas → PDF im Storage);
      Schadensfälle fließen als Position in die Rechnung.

### Phase 4 — Operative Intelligenz

- [ ] **P4.1 Personal-Konflikte:** Warnung bei überlappender Verplanung von Mitarbeitern
      (recycelt `lib/availability.ts`; **aufgewertet** — Personal ist im Dienstleistungs-
      modell Kernressource). → **wird von `PLAN-MEIN-PLAN.md` M5 miterledigt** (dort
      inkl. persönlicher Verfügbarkeit: „nicht verfügbar" **ohne Grund preiszugeben**).
- [ ] **P4.2 Lieferanten- & Margen-Auswertung:** EK-Preisvergleich je Gerätetyp über
      Verleiher, Deckungsbeitrag je Kunde/Monat, Auslastungs-Trends. *(Ersetzt die frühere
      Geräte-ROI-Idee — die trägt im kleinen Rest-Inventar nicht mehr.)*
- [ ] **P4.3 Kalender-Politur** (Design-Stufe 4). → **geht in P1.5.4 (U4) auf**
      (Ebenen-Modell + Ansichts-Umschalter auf `ui/Tabs`).
- [ ] **P4.4 Engpass-Sammelansicht** (E9): Anmiet-Bedarf über alle anstehenden Jobs.

### Phase 5 — Reife & Nachvollziehbarkeit

- [ ] **P5.1 Globale Suche** (⌘K über Geräte/Jobs/Kunden/Angebote/Rechnungen/**Anmietungen/
      Dokumente**, RLS-konform).
- [ ] **P5.2 Änderungsprotokoll** (Audit-Log per Trigger: wer/wann/was; Verlaufs-Tab).
- [ ] **P5.3 Performance-Feinschliff** (Chunk-Größen, Erststart).

### Phase 6 — Ruhiger Betrieb

*Kein Feature-Ziel, sondern ein Zustand:* App trägt den Alltag; Automationen melden
Probleme, bevor Till sie bemerkt; Runbooks (inkl. Restore-Drill) aktuell; neue Wünsche
laufen als kleine, bewiesene Schritte über den normalen Weiterentwicklungs-Modus.

## 6. Pflege dieser Datei

- Baustein erledigt → Haken + Datum dahinter (z. B. `[x] … (2026-07-12)`).
- Reihenfolge ändern nur mit Till. Neue große Ideen erst in `IDEAS.md`, in eine Phase
  gehoben werden sie hier.
- Eine neue Session ohne konkreten Auftrag nimmt den **obersten offenen Baustein der
  niedrigsten offenen Phase** und legt dafür zuerst einen kurzen Plan vor. **Ausnahme:**
  P0.1 (Backup) hat Vorrang vor den Neuausrichtungs-Etappen (Phase 1/2); danach dürfen
  Phase 0 und die Neuausrichtung abwechselnd bedient werden — konkrete Aufträge von Till
  stechen immer.
