# Arbeitsweise — welcher Skill wann (Tills Arbeits-Workflow)

> Wie Till mit Claude an diesem Projekt arbeitet — Aufgabengröße bestimmt Ablauf,
> Modell und Skills. Ergänzt `CLAUDE.md` (Regeln), `WORKFLOW.md` (Technik lokal→live)
> und `IDEAS.md` (Was steht an). Stand: 2026-07-18.

## Die drei Aufgaben-Größen

### Klein (Minuten): Textänderung, kleiner Fix, Frage

- **Modell:** Sonnet oder Haiku — Opus ist hier Verschwendung.
- **Ablauf:** direkt machen → Prüfkette grün → Browser-Beweis falls sichtbar → Commit + Push.
- **Skills:** keine nötig. Höchstens `verification-before-completion` als Haltung:
  erst beweisen, dann „fertig" sagen (deckt sich mit dem Verifikations-Ritual).

### Mittel (eine Session): neues Feld, neue Liste, Umbau einer Seite

- **Modell:** Sonnet reicht meist; Opus nur, wenn es hakt.
- **Ablauf:**
  1. **`brainstorming`** (superpowers): Bevor gebaut wird, klärt Claude Absicht und
     Anforderungen — konkrete Optionen statt Drauflosbauen. Genau Tills Regel
     „Bauchgefühl ist ein Anforderungsdokument".
  2. Bei UI: **Mockup zeigen, bevor gebaut wird** (Till entscheidet visuell).
     Design-Skills siehe unten.
  3. Bauen, dabei `feature-fertigstellen` (Projekt-Skill) als Abschluss-Checkliste.
  4. Bei Schema-Änderung: **immer** `db-migration` (Projekt-Skill) + Agent
     `migrations-pruefer` vor dem Anwenden.
  5. `IDEAS.md` pflegen, Commit + Push.

### Groß (mehrere Sessions): neuer Bereich, z. B. Anmietung, Kalkulation

- **Modell:** Opus/Fable fürs Planen, Sonnet fürs Abarbeiten — das spart Limit genau da,
  wo die Masse der Arbeit liegt.
- **Ablauf:**
  1. **`brainstorming`** → Anforderungen schärfen.
  2. **`writing-plans`** (superpowers) zusammen mit Projekt-Skill `grosses-feature`:
     Plan-Dokument `PLAN-<name>.md` im Repo (überlebt jede Session).
  3. **`executing-plans`** in neuen, frischen Sessions: Plan lesen, nächste Etappe
     abarbeiten, Haken setzen. Nicht alles in einem Mammut-Chat.
  4. Jede Etappe einzeln verifizieren + committen (kleine Schritte, s. CLAUDE.md).

## Design-Arbeit (UI bauen oder überarbeiten)

Reihenfolge, wenn eine Seite neu entsteht oder umgestaltet wird:

1. **`ui-ux-pro-max`** liefert das Fundament: Stil, Farben, Typo, UX-Regeln passend zum
   Produkttyp („internes B2B-Tool, Dashboard, dicht") — inkl. Checkliste
   (Kontrast, Touch-Ziele 44px, Mobile-first).
2. **`apple-design` / `emil-design-eng`** für den Feinschliff: Details, die Software
   „teuer" wirken lassen (Abstände, Zustände, Mikro-Interaktionen).
3. **`improve-animations` / `review-animations`** nur gezielt, wenn Bewegung dazukommt.
4. Danach gilt weiter `apps/web/CLAUDE.md` (Listen-Rezept, Design-System) — die
   Projekt-Konventionen schlagen generische Skill-Empfehlungen.

**Nicht** mehrere Design-Skills gleichzeitig laden — einer als Leitlinie reicht,
sonst widersprechen sie sich und kosten nur Kontext.

## Fehlersuche

Bei jedem Bug, der nicht auf den ersten Blick klar ist: **`systematic-debugging`**
(superpowers) — erst Ursache verstehen und belegen, dann fixen. Kein Raten-Fixen.

## Token-Sparregeln (Kurzfassung)

1. Modell nach Aufgabengröße wählen (s. oben) — der größte Hebel.
2. Neues Thema = neue Session; Plan-Dokumente statt Chat-Gedächtnis.
3. Konkrete Dateien/Funktionen nennen statt „schau mal alles an".
4. Keine Subagenten-Schwärme; einer gezielt, wenn überhaupt.

## Was bewusst NICHT im Einsatz ist

- **claude-mem, Graphify, Ruflo, RTK:** geprüft am 2026-07-18, verworfen —
  doppeltes Memory, zu junges Ökosystem, Overkill bzw. zu tiefer Eingriff.
  Bei neuem Schmerzpunkt neu bewerten, nicht blind nachrüsten.
- **`test-driven-development` (superpowers)** ist installiert, wird aber nur bei
  Kernlogik (Summen, Status, Nummernkreise) gezielt genutzt — dort gilt ohnehin die
  Vitest-Pflicht aus dem Verifikations-Ritual.
