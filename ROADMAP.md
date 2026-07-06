# ROADMAP — EventTech-Manager

> **Der Nordstern für alle Sessions.** Bei jeder Arbeit gilt: diese Datei sagt WOHIN und
> in welcher Reihenfolge; `CLAUDE.md` sagt WIE (Regeln/Rituale); `IDEAS.md` hält den
> Kleinkram und den Verlauf; `PLAN-*.md` vertiefen einzelne große Vorhaben.
> Nach jedem erledigten Baustein: Haken setzen + Datum. Stand: **2026-07-07**.

---

## 1. Das Langzeit-Ziel

EventTech-Manager ist das **Betriebssystem von Tills Eventtechnik-Verleih** — ein
selbst kontrolliertes System, über das das gesamte Geschäft läuft:

**Anfrage → Angebot → Job (Packliste, Personal, Zeitplan) → Rechnung → Zahlung → Auswertung**

„Angekommen" sind wir, wenn drei Sätze dauerhaft wahr sind:

1. **„Alles läuft hier drin."** Kein Excel, keine Zettel, kein „das steht noch in
   WhatsApp" — jeder Vorgang hat seinen Platz und ist am Job/Kunden auffindbar.
2. **„Es kann nichts verloren gehen."** Automatische Backups inkl. Dateien, ein real
   geprobter Wiederherstellungs-Weg, rechtssichere Dokumente (GoBD).
3. **„Es baut sich sicher weiter."** Muster, Invarianten und Rituale sind so dokumentiert
   und durch Automationen abgesichert, dass auch schwächere Modelle gefahrlos
   weiterentwickeln können — Qualität hängt an der Maschine, nicht am Modell.

Maßstab für alles Sichtbare: **professionelle Branchen-Software** (Rentman/Current RMS
für den Verleih-Workflow, lexoffice/sevDesk fürs Rechnungswesen). Keine nackten Listen,
keine Insel-Daten, keine UI-only-„Sicherheit".

## 2. Wo wir stehen (ehrliche Bestandsaufnahme)

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
Restore-Weg) · kein E-Mail-Versand von Angeboten/Rechnungen · keine Personal-
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

- **Starkes Modell (Fable-Klasse), solange verfügbar:** alles, was „einmal schwer, für
  immer wertvoll" ist — Phase 0 komplett; von den harten Features (P2/P3) mindestens die
  **fertigen Entwürfe** als `PLAN-*.md` (Schema, RLS, Entscheidungen, Risiken), damit
  später nur noch ausgeführt wird.
- **Schwächere Modelle:** Muster-Folge-Arbeit — Listen nach dem Listen-Rezept
  (`apps/web/CLAUDE.md`), UI-Politur, kleine Features nach vorhandenem Vorbild,
  Ausführung fertiger Pläne. Immer unter dem Schutz der Guardrails aus Phase 0.
- **Faustregel:** Wenn ein Fehler Geld, Recht oder Daten kostet (Nummernkreise, RLS,
  Backups, Löschlogik) → stärkstes verfügbares Modell + DB-seitige Absicherung + Tests.

## 5. Die Phasen

### Phase 0 — Das Fundament unzerstörbar machen  ⟵ **JETZT**

*Ziel: Datenverlust unmöglich, Regressionen werden automatisch gefangen.*

- [ ] **P0.1 Backup automatisch:** tägliches Cloud-Backup (DB **und** Storage-Dateien),
      Ablage außerhalb Supabase, Aufbewahrungs-Rotation.
      *Fertig, wenn:* ein Backup nachweislich ohne menschliches Zutun entstanden ist.
- [ ] **P0.2 Restore geprobt:** dokumentierter Wiederherstellungs-Weg, **einmal real
      durchgespielt** (in eine leere lokale Instanz).
      *Fertig, wenn:* aus einem echten Backup eine funktionierende App entstand.
- [ ] **P0.3 CI-Guardrails:** harte Checks, die den Build brechen bei: Service-Role-Key
      im Frontend-Code · neuer Tabelle ohne RLS/GRANT · Migrations-Nummern-Duplikat.
      *Fertig, wenn:* ein absichtlicher Verstoß im Test-Branch rot wird.
- [ ] **P0.4 Invarianten-Tests ausbauen:** Set-Auflösung in der Verfügbarkeit,
      Mahn-Stufenlogik, Storno-Semantik; ein Playwright-E2E-Smoke
      (Login → Job → Packliste → Rechnung stellen).
- [ ] **P0.5 Wochen-Report (Automation):** wöchentliche Zusammenfassung „überfällige
      Rechnungen + fällige DGUV-Prüfungen + anstehende Jobs" (E-Mail oder Dashboard-Kachel).

### Phase 1 — Den Geld-Kreislauf schließen

*Ziel: Vom Angebot bis zur bezahlten Rechnung ohne Medienbruch.*

- [ ] **P1.1 Mahnwesen scharf schalten:** Resend-Key (Till setzt Secret), `send-dunning`
      deployen, Vorschau-Test, erste echte Mahnung. *(Nach-außen-wirkend: Freigabe!)*
- [ ] **P1.2 Angebote/Rechnungen per E-Mail** direkt an Kunden (PDF-Anhang,
      Versand-Protokoll wie beim Mahnwesen, „ruhig by default").
- [ ] **P1.3 Übergabe-/Rücknahmeprotokoll** mit Unterschrift (Canvas → PDF im Storage);
      Schadensfälle fließen als Position in die Rechnung.

### Phase 2 — Operative Intelligenz

- [ ] **P2.1 Personal-Konflikte:** Warnung bei überlappender Verplanung von Mitarbeitern
      (recycelt `lib/availability.ts`; kleiner Aufwand, hoher Hebel).
- [ ] **P2.2 Auswertungen vertiefen:** Geräte-ROI (Vermiettage × Preis vs.
      Wiederbeschaffungswert), Auslastungs-Trends.
- [ ] **P2.3 Kalender-Politur** (Design-Stufe 4; bewusst leicht, Muster-Folge-Arbeit).

### Phase 3 — Reife & Nachvollziehbarkeit

- [ ] **P3.1 Globale Suche** (⌘K über Geräte/Jobs/Kunden/Angebote/Rechnungen, RLS-konform).
- [ ] **P3.2 Änderungsprotokoll** (Audit-Log per Trigger: wer/wann/was; Verlaufs-Tab).
- [ ] **P3.3 Performance-Feinschliff** (Chunk-Größen, Erststart).

### Phase 4 — Ruhiger Betrieb

*Kein Feature-Ziel, sondern ein Zustand:* App trägt den Alltag; Automationen melden
Probleme, bevor Till sie bemerkt; Runbooks (inkl. Restore-Drill) aktuell; neue Wünsche
laufen als kleine, bewiesene Schritte über den normalen Weiterentwicklungs-Modus.

## 6. Pflege dieser Datei

- Baustein erledigt → Haken + Datum dahinter (z. B. `[x] … (2026-07-12)`).
- Reihenfolge ändern nur mit Till. Neue große Ideen erst in `IDEAS.md`, in eine Phase
  gehoben werden sie hier.
- Eine neue Session ohne konkreten Auftrag nimmt den **obersten offenen Baustein der
  niedrigsten offenen Phase** und legt dafür zuerst einen kurzen Plan vor.
