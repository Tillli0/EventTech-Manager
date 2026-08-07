# Arbeitsweise — welcher Skill wann (Tills Arbeits-Workflow)

> Wie Till mit Claude an diesem Projekt arbeitet — Aufgabengröße bestimmt Ablauf,
> Modell und Skills. Ergänzt `CLAUDE.md` (Regeln), `WORKFLOW.md` (Technik lokal→live)
> und `IDEAS.md` (Was steht an). Stand: 2026-07-18.

## Tills Fahrplan: So arbeitest du am effektivsten mit Claude

**1. Session starten mit Kontext, nicht mit Kaltstart.**
Erste Nachricht einer Session: sag, WO du weitermachen willst — „lies IDEAS.md und
PLAN-NEUAUSRICHTUNG.md, wir machen an Etappe X weiter" statt „hi, was war nochmal offen?".
Claude liest dann gezielt statt breit.

**2. Sag das Ziel, nicht die Lösung.**
„Ich will beim Job sofort sehen, ob er sich lohnt" ist eine bessere Anfrage als
„bau mir eine Spalte mit Deckungsbeitrag in die Tabelle". Claude schlägt dann Optionen
vor, und du entscheidest — oft kommt was Besseres raus als deine erste Idee.
Dein Unbehagen („das hat kein System") ist eine vollwertige Anfrage — sprich es aus.

**3. Bei UI: erst Mockup verlangen, dann bauen lassen.**
„Zeig mir 2–3 Varianten als Vorschau, bevor du baust." Du entscheidest gut, wenn du
etwas siehst — und ein verworfenes Mockup kostet Minuten, ein verworfenes Feature Stunden.

**4. Ein Thema pro Session.**
Rechnung fertig → neue Session für den Kalender. Lange Misch-Sessions werden teuer
(Kontext wächst) und unscharf (Claude schleppt Altlasten mit). Was die Session überleben
muss, gehört in IDEAS.md oder ein PLAN-Dokument — dafür sorgt Claude, du musst es nur
einfordern, wenn es fehlt: „schreib das ins Repo".

**5. Modell nach Größe wählen (dein größter Limit-Hebel).**
Frage/Kleinkram → Haiku oder Sonnet. Normale Features → Sonnet. Nur Planung großer
Vorhaben oder festgefahrene Probleme → Opus. Wechsel per `/model`.

**6. Am Ende jeder Aufgabe: Beweis einfordern.**
„Zeig mir das im Browser" oder „was sagt die Prüfkette?" — nimm kein „müsste
funktionieren" an. Das Verifikations-Ritual ist Pflicht, du darfst darauf pochen.

**7. `+` als Fokus-Schalter nutzen.**
`+` vor der Nachricht = Claude macht NUR das Genannte, keine Extras. Gut für schnelle,
kontrollierte Änderungen — und spart nebenbei Tokens.

---

## Die drei Aufgaben-Größen (Claudes Ablauf je Größe)

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
