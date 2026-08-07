---
name: EventTech Manager
description: Betriebssystem für Tills Event-Dienstleistung — Anfrage bis Nachkalkulation, hell und werkzeug-ehrlich.
colors:
  creme-bg: "rgb(242 239 233)"
  creme-surface: "rgb(255 255 255)"
  creme-raised: "rgb(247 245 241)"
  creme-border: "rgb(227 222 212)"
  creme-border-subtle: "rgb(237 233 226)"
  creme-ink: "rgb(26 24 21)"
  creme-ink-muted: "rgb(107 102 93)"
  creme-ink-faint: "rgb(155 149 138)"
  creme-accent: "rgb(31 29 26)"
  creme-accent-hover: "rgb(56 52 46)"
  creme-accent-soft: "rgb(237 233 225)"
  weiss-accent: "rgb(79 70 229)"
  status-verfuegbar: "rgb(20 113 58)"
  status-ausgeliehen: "rgb(29 78 216)"
  status-defekt: "rgb(185 28 28)"
  status-wartung: "rgb(154 74 8)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
  numeric:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontFeature: "tabular-nums"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "10px"
components:
  button-primary:
    backgroundColor: "{colors.creme-accent}"
    textColor: "rgb(255 255 255)"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.creme-accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.creme-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: EventTech Manager

## Overview

**Creative North Star: "Das Werkzeug-Regal, nicht die Vitrine"**

EventTech Manager ist eine interne Betriebssoftware für ein kleines Event-Technik-Team,
täglich vielfach geöffnet — nicht eine Marketingfläche, die einmal beeindrucken muss.
Die Oberfläche ist hell, ruhig und werkzeug-ehrlich: Farbe wird ausschließlich als
Signal eingesetzt (Status, Handlungsbedarf), nie als Dekoration. Zahlen sind das
zentrale Material des Produkts (Beträge, Termine, Bestände) und tragen deshalb
konsequent eine eigene, tabellarische Schrift statt der Fließtext-Schrift.

Bestätigte visuelle Ablehnungen: kein Dark-Mode als Standard (nur optional, nicht
gepflegt), keine gesättigte Zweitfarbe als Markenfarbe, keine dekorativen Farbverläufe
oder Glas-Effekte, keine farbigen Akzentbalken als Standard-Stilmittel.

**Key Characteristics:**
- Ein Farbsystem, zwei helle Varianten (Creme/Schwarz als Standard, Weiß/Indigo als
  Alternative) — beide über CSS-Variablen zur Laufzeit umschaltbar, nie einkompiliert.
- Zahlen immer `font-mono` + `tabular-nums`, Text immer `font-sans`.
- Flache Flächen, dünne Haarlinien statt Schatten als primäres Trennmittel.
- Domänenfarbe kommt ausschließlich aus `lib/statusTone.ts` — nie neu zugeordnet.

## Colors

Zwei gepflegte helle Varianten über `data-theme`; eine dritte (Dunkel) existiert,
wird aber nicht aktiv gepflegt und fließt hier nicht ein.

### Primary (Aktionsfarbe)
- **Creme-Schwarz** (`rgb(31 29 26)` / hover `rgb(56 52 46)`): Standard-Theme „Creme" —
  Buttons, aktive Zustände, der eine Fortschritts-Ring auf der Startseite.
- **Weiß-Indigo** (`rgb(79 70 229)`): dieselbe Rolle im Theme „Weiß+Indigo" — dieselben
  Klassennamen (`bg-accent`, `text-accent` …), andere CSS-Variable, kein Extra-Code.

### Neutral
- **Creme-Grund** (`rgb(242 239 233)`): Seitenhintergrund.
- **Fläche** (`rgb(255 255 255)`): Karten/Sektionen auf Creme-Grund.
- **Erhöhte Fläche** (`rgb(247 245 241)`): dezente Zweitfläche (z. B. Zeitplan-Spalte).
- **Tinte** (`rgb(26 24 21)`): Haupttext.
- **Tinte gedämpft** (`rgb(107 102 93)`): Sekundärtext — Pflicht-Mindestkontrast
  gegen Creme ist hier erreicht (~5:1).
- **Tinte matt** (`rgb(155 149 138)`): rein dekorative/tertiäre Elemente (Icon-Farbe,
  Trennpunkte) — **nicht** für Fließtext geeignet, Kontrast gegen Creme liegt bei nur
  ~2,6:1.

### Status (aus `lib/statusTone.ts`, nie neu zuordnen)
- **Verfügbar/Gut** (`rgb(20 113 58)`), **Ausgeliehen/Info** (`rgb(29 78 216)`),
  **Defekt/Schlecht** (`rgb(185 28 28)`), **Wartung/Mittel** (`rgb(154 74 8)`) — je
  eigene getönte Hintergrundfarbe für Badges/Zeilen. Acht weitere Job-Status-Farben
  parallel dazu (`job-*`), gegen Creme UND Weiß auf ≥4,5:1 geprüft.

### Named Rules
**The Token-Only Rule.** Niemals Hex-Werte in Komponenten. Ausnahmen ausschließlich:
Nutzerfarben aus der DB (Job-/Kategorie-/Ortsfarbe), PDF-Erzeugung, Theme-Vorschaukacheln.

**The Faint-Is-Not-Body Rule.** `ink-faint` ist für Dekoration, nicht für lesbaren
Text — jede Beschriftung, die Till tatsächlich lesen muss, nutzt mindestens `ink-muted`.

## Typography

**Display/Body-Font:** Inter (mit `ui-sans-serif, system-ui, sans-serif`)
**Zahlen-Font:** JetBrains Mono (mit `ui-monospace, SFMono-Regular, monospace`)

**Charakter:** Eine ruhige, neutrale Grotesk für Text — die eigentliche Stimme des
Produkts liegt in den Zahlen, die konsequent in einer eigenen Mono-Schrift mit
tabellarischen Ziffern stehen und dadurch sofort als „das Messbare" erkennbar sind.

### Hierarchy
- **Headline** (600, `text-xl`/20px, snug): Seitentitel, Job-Titel im Hauptinstrument.
- **Title** (600, `text-sm`/14px): Sektions-Überschriften.
- **Body** (400/500, `text-sm`/14px): Zeileninhalte, Listen.
- **Label** (400–500, `text-xs`/12px): Metadaten, Kennzahl-Beschriftung.
- **Numeric** (600, `text-2xl`/24px für Kennzahlen, `text-xs`–`text-sm` für Beträge
  in Zeilen): immer `font-mono tabular-nums`.

### Named Rules
**The Mono-Numbers Rule.** Jede Zahl, jeder Code, jeder Betrag steht in
`font-mono tabular-nums` — auch außerhalb von Kennzahl-Kacheln (Datumsspannen,
Beträge in Zeilen, Ring-Beschriftung).

## Layout

Container `max-w-6xl`, mobil `px-4`, ab `md` `px-8`. Grundabstand zwischen Sektionen
`space-y-5` (20px). Zweispaltiges Layout ab `lg` (Listen-Sektionen: 2/3 + 1/3);
darunter einspaltig gestapelt. Kennzahlen-Instrumente: `grid-cols-2` mobil,
`sm:grid-cols-3`, `lg:grid-cols-5` — als EIN Element mit `divide-x`/`divide-y`
statt separater Karten mit Lücken dazwischen.

## Elevation & Depth

Flach. Keine Schlagschatten als Trennmittel — Trennung entsteht durch dünne
1px-Haarlinien (`border-border` / `border-border-subtle`) und durch Flächenwechsel
(`bg-bg` → `bg-bg-surface` → `bg-bg-raised`), nie durch `box-shadow`.

### Named Rules
**The Flat-By-Default Rule.** Karten und Kennzahlen-Instrumente bekommen keinen
Schatten und keinen Hover-Lift; Zustandswechsel läuft über Rand- oder Flächenfarbe.

## Shapes

Kleine, konsistente Radien: `4px` (sm) für kompakte Elemente, `6px` (Standard) für
die meisten Karten/Zeilen, `8–10px` für größere Container. Keine großen (16px+),
„bubbligen" Radien. Kreisförmige Elemente (Avatare, Statuspunkte, der
Fortschritts-Ring) sind vollständig rund.

## Components

### Buttons
- **Shape:** `rounded-md` (6px).
- **Primary:** `bg-accent` / `text-accent-on`, Padding `px-4 py-2`.
- **Hover:** `bg-accent-hover`, reine Farbänderung, keine Bewegung/Schatten.
- **Secondary:** transparente Fläche, `border-border`, Text `text-ink`.

### Badges (`StatusBadge.tsx`)
- **Style:** Pille mit farbigem Punkt + gedämpfter Textfarbe aus `statusTone.ts`,
  nie freihändig zugeordnete Farbe.

### Cards / Sections (`SectionCard`)
- **Corner Style:** `rounded-lg` (8px).
- **Background:** `bg-bg-surface` auf `bg-bg`-Grund.
- **Border:** 1px `border-border`, Kopfzeile abgetrennt mit `border-border-subtle`.
- **Kein Schatten.**

### Listenzeilen
- **Style:** Haarlinien-getrennte Zeilen (`space-y-1`, `hover:bg-bg-raised`), kein
  farbiger Akzentbalken links. Statuspunkt (kleiner Kreis) statt Balken, wo eine
  Domänenfarbe (z. B. Job-Farbe) gezeigt werden muss.

### Fortschritts-Ring (Signature Component, `components/dashboard/ProgressRing.tsx`)
Das einzige bewusst gesetzte Ring-Instrument der Anwendung — zeigt echten
Zeit-Fortschritt (`lib/jobProgress.ts`), nie einen erfundenen Wert. `null` = leerer
Ring (noch nicht gestartet). SVG, `stroke-border` als Bahn, `stroke-accent` als
Füllung, `stroke-linecap: round`, 700ms `ease-out`-Übergang. **Bewusst nicht als
Muster für Kennzahlen wiederverwendet** — die Kennzahlen-Instrumentenleiste bleibt
zahlengeführt (Scanbarkeit bei täglicher Mehrfachnutzung wiegt schwerer als das
Bild eines Zeiger-Instruments je Kennzahl).

### Kennzahlen-Instrumentenleiste (Signature Component)
EIN durchgehendes Element mit `divide-x`/`divide-y` statt fünf einzelner Karten:
Label + kleines Icon oben, große Mono-Zahl darunter, gedämpfte Unterzeile. Optionaler
kleiner Ampel-Punkt (`levelTone`) statt Icon-in-Farbfläche.

## Do's and Don'ts

### Do:
- **Do** Farben ausschließlich über die Tailwind-Token/CSS-Variablen beziehen.
- **Do** jede Zahl/jeden Betrag in `font-mono tabular-nums` setzen.
- **Do** `ink-muted` statt `ink-faint` für Text, den jemand tatsächlich lesen muss.
- **Do** Statuspunkte (Kreis) statt Farbbalken für Domänenfarben in Listenzeilen.

### Don't:
- **Don't** farbige `border-l`-Akzentbalken als Standard-Stilmittel neu einführen
  (an anderer Stelle der App vorhanden — dort historisch gewachsen, kein Vorbild für
  neue Flächen). Auch mechanisch geprüft: der Impeccable-Detector flaggt dieses Muster
  projektweit als KI-Slop-Tell.
- **Don't** Schlagschatten oder Hover-Lift als Standard-Kartenzustand einführen.
- **Don't** neue Ring-/Zeiger-Instrumente für reine Kennzahlen bauen — der Ring ist
  für den einen echten Zeit-Fortschritt reserviert, nicht als Dekor wiederholbar.
- **Don't** `ink-faint` für Beschriftungen mit echtem Informationswert verwenden.
