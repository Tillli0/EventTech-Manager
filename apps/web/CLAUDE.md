# apps/web — Frontend-Leitfaden (gilt für alles unter diesem Ordner)

Vite + React + TypeScript + TanStack Query + Tailwind. Deutsche UI-Texte, Premium-Look.

> ⚠️ **Im Umbruch (Entscheidung 2026-07-18):** Die App ist **heute** dark-only mit
> Indigo-Akzent — das wird auf ein **helles Theme** umgestellt, mit umschaltbaren Paletten
> (Creme · Weiß+Indigo · Dark) über CSS-Variablen. Details und Reihenfolge:
> `PLAN-UI-NEUSCHNITT.md` (Etappe U2). **Bis U2 gilt der Bestand unten** — aber keine neuen
> hart kodierten Hex-Werte mehr anlegen, sie sind der Blocker für den Umschalter.

## Design-System (Token-first, keine Roh-Farben)

- **Alle Farben aus `tailwind.config.js`:** `bg / bg-surface / bg-raised`, `border`,
  `ink / ink-muted / ink-faint`, `accent` (Indigo), `status-*` (verfuegbar/ausgeliehen/
  defekt/wartung + `-bg`-Tönungen), `job-*` (eine Farbe je Job-Status). **Nie Hex-Werte
  in Komponenten** — Ausnahme: dynamische Kategorie-/Set-Farben aus der DB (dann per
  `style` mit Alpha-Suffix wie `${color}14` für Tönungen).
- Schrift: Inter; Zahlen/Codes/Beträge immer `font-mono`.
- **Basis-Komponenten in `src/components/ui/` sind Pflicht** statt Eigenbau:
  `Button`, `Card`, `Dialog`, `Input/Select/Textarea/FormField`, `Tabs` (Segment-Umschalter
  mit Icon/Zähler/sm/stretch), `StatusBadge` (je Domäne), `States` (Loading/Error/Empty),
  `Toast`, `ConfirmDialog`, `SummaryStats`, `YearFilter`, `GroupRow`, Datum-Felder.
  Fehlt etwas Generisches: **dort ergänzen**, nicht in der Seite nachbauen.
- Wiederkehrende Zeilen-Optik („Jobs-Look"): Karte mit **farbigem linkem Akzentbalken**
  (`border-l-[3px]` + Domänenfarbe), Icon-/Foto-Kachel, Titel + Mono-Code, gedämpfte
  Unterzeile, Badges rechts. Vorbilder: `JobsPage`, `InventoryPage` (`DeviceListRow`).

## Das Listen-Rezept (Standard für jede Übersichtsseite)

Jede Liste (Angebote, Rechnungen, künftige) bekommt dieselben Bausteine — nie wieder
nackte Tabellen:

1. **Kennzahlen-Kopf** (`SummaryStats`): Anzahl + Summen je relevantem Zustand.
2. **Status-Tabs** (`Tabs` mit Zählern), Standard = das Aktive, „Alle" als Option.
3. **Jahr-Umschalter** (`YearFilter`) fürs Archiv — Vergangenes einen Klick weit weg.
4. **Gruppierung mit Zwischensummen** (`lib/listGrouping.ts` + `GroupRow`), Monat/Kunde
   umschaltbar, einklappbar.
5. **Verknüpfungen sichtbar:** Zeile → Kunde/Job; Folge-Dokument („→ RE-2026-0001").
6. **Detail als Drawer** mit Verlaufs-Zeitstrahl (`lib/invoiceTimeline.ts` als Muster).
7. **CSV-Export** der gefilterten Sicht (`lib/csv.ts`).

## Datenschicht (Hooks-Muster)

- Pro Domäne eine Hook-Datei `src/hooks/useXxx.ts`: ein `XXX_KEY`, ein geteilter
  `SELECT`-String mit Joins, `useQuery`-Lesehooks (Varianten wie `useInvoicesForJob`
  über `enabled: !!id`), `useMutation`-Hooks mit `invalidateQueries` auf den Domänen-Key.
- **Reine Logik gehört nicht in Komponenten**, sondern als pure Funktion nach
  `src/lib/*.ts` oder `src/types/database.ts` (z. B. `offerTotals`, `invoiceDerivedStatus`,
  `availability.ts`) — **mit Vitest-Test daneben** (`*.test.ts`). Komponenten bleiben Anzeige.
- Supabase-Client nur über `@/lib/supabase`; niemals Service-Role im Frontend.
- Neue Seite = Lazy-Route in `router.tsx` (+ `RequireArea`) + Eintrag in `lib/nav.ts`.
  Schwere Bibliotheken (PDF!) nur per dynamischem Import (`lib/invoicePdf.tsx` als Muster).

## Formatierung & Sprache

- Datum/Währung/Zahlen ausschließlich über `lib/format.ts` (deutsche Formate, `—` für
  leer). Beträge nie selbst formatieren.
- UI-Texte deutsch, kurz, in Tills Sprache („Rechnung stellen", „ausgebucht"). Destruktives
  immer über `ConfirmDialog` mit klarer Folge-Beschreibung; Erfolg/Fehler über `Toast`.

## Qualität

- ESLint mit `--max-warnings 0`: ungenutzte Importe/Variablen (auch nach Refactors) und
  ungenutzte eslint-disable-Direktiven brechen den Build. Absichtlich Ungenutztes mit
  `_`-Präfix benennen.
- Responsive-Muster: unwichtigere Spalten mit `hidden sm:table-cell` / `lg:inline`
  ausblenden; bei Layout-Änderungen 375px + Desktop im Preview prüfen.
- Barrierefreiheit-Minimum: Icon-Buttons brauchen `aria-label` + `title`.
