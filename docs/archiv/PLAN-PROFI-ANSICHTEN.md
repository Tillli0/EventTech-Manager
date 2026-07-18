# Plan: Professionelle Listen- & Archiv-Ansichten (Angebote, Rechnungen, Jobs)

> **Stand 2026-07-05: UMGESETZT** (Branch `listen-archiv` → main, Commit 47f3cc9) —
> Stufen 1–5 inkl. Kennzahlen-Kopf, Status-Tabs, Jahr-Archiv, Gruppen, Detail-Drawer
> mit Zeitstrahl, Vorgangs-Verknüpfung und CSV. Bleibt als Referenz für die
> Design-Begründung und das Listen-Rezept (jetzt auch in `apps/web/CLAUDE.md`).

> Für eine Fable-5-Session. Vorher lesen: `CLAUDE.md`, `IDEAS.md`, `PLAN-FABLE5.md`.
> Zweck: Die zentralen Listen (Angebote, Rechnungen, Job-Archiv) sind heute **flache
> Listen ohne System**. Dieser Plan macht sie so strukturiert und vertrauenswürdig wie
> professionelle Branchen-Software — **ohne** an den gespeicherten Daten selbst etwas zu
> ändern. Reiner Aufwertungs-Umbau der Darstellung + Verknüpfung.

## Kontext / Warum

Recherche (lexoffice/sevDesk für Rechnungswesen; Rentman/Current RMS/HireHop für
Eventtechnik-Verleih) zeigt: gute Software ersetzt die nackte Liste durch **wiederkehrende
Ordnungs-Bausteine**:

1. **Status zuerst** — die Liste zeigt standardmäßig, was zu tun ist (offen/fällig), nicht
   alles; klare Status mit automatischem Übergang.
2. **Jahres-/Zeitraum-Navigation fürs Archiv** — Vergangenes liegt hinter einem
   Jahr-Umschalter, nicht im endlosen Scroll.
3. **Kennzahlen-Kopf** — Anzahl + Summen je Status über der Liste, damit sie auf einen
   Blick Bedeutung hat.
4. **Gruppierung mit Zwischensummen** — nach Monat oder Kunde statt bloßer Aufzählung.
5. **Alles hängt am Vorgang** — Angebot/Rechnung sind am Job/Kunden sichtbar, mit
   **Verlaufs-Zeitstrahl** je Dokument; man öffnet das Event und sieht seine Dokumente.
6. **Verknüpfte Nummern + Export** — AN-2026-0001 → RE-2026-0001 zum Anklicken;
   gefilterte Liste als CSV exportierbar.

Heutiger Stand im Code: Rechnungen haben bereits Status-Tabs + offene Summe (`InvoicesPage`).
Angebote sind eine nackte Liste. Rechnungen hängen an keinem Job/Kunden in der Oberfläche
(die „Insel", die der Nutzer spürt). Kein Jahr-Archiv, keine Gruppierung, kein Zeitstrahl.

## Leitplanken

- **Wiederverwenden statt neu bauen:** `ui/Tabs.tsx`, `ui/Card.tsx`, `ui/StatusBadge.tsx`
  (`OfferStatusBadge`/`InvoiceStatusBadge`), `PageHeader`, `States.tsx`, `lib/csv.ts`
  (`exportToCsv`), `invoiceDerivedStatus`/`offerTotals` (`types/database.ts`), die Hooks
  `useOffers.ts`/`useInvoices.ts`. Die einklappbare Gruppierung aus `InventoryPage.tsx`
  (Kategorie-Köpfe) ist die Vorlage für Monats-/Kundengruppen.
- **Meist reines Frontend** — kein Schema nötig. Falls doch (siehe Stufe 3/4), Migration ab
  `0037`, RLS + GRANTs nach `0012`-Muster, non-destruktiv.
- **Verifizieren vor jedem Commit:** `tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build`
  grün; Sortier-/Gruppen-/Jahres-Logik mit Vitest absichern (`lib/*.test.ts`-Muster). Kleine
  Commits, direkt auf `main`. Dark-Theme, deutsche UI.

---

## Stufe 1 — Gemeinsame Ordnungs-Bausteine (Fundament, reines Frontend)

Einmal bauen, dann von Angeboten/Rechnungen/Jobs geteilt. Neu in `src/components/ui/` bzw.
`src/lib/`:

- **`SummaryStats`** — Kennzahlen-Kopf: Kacheln mit Label + Zahl + optional Summe/Farbe.
  Verallgemeinert die Rechnungs-„offen"-Summe und die Inventar-Kennzahlen (farbige Zahl +
  Mini-Balken existieren schon in `InventoryPage`).
- **`YearFilter`** — Zeitraum-Umschalter: leitet vorhandene Jahre aus den Daten ab, Standard
  = laufendes Jahr, plus „Alle". Als `Tabs` oder schlanker Segment-Umschalter.
- **`groupBy`-Helfer + `GroupedList`** — gruppiert Zeilen nach Monat oder Kunde, mit
  Zwischensummen-Kopf; einklappbar (Muster aus `InventoryPage`). Gruppier-/Summenlogik in
  eine pure Funktion (`lib/listGrouping.ts`) auslagern → Vitest.

**Fertig, wenn:** die drei Bausteine existieren, getestet, und an einer Beispielseite
sichtbar funktionieren.

## Stufe 2 — Angebote professionalisieren (die genannte „nackte Liste")

Datei: `src/pages/OffersPage.tsx` (+ `useOffers.ts`). Ersetzt zugleich „Design-Stufe 3
Angebote" aus `PLAN-FABLE5.md`.
- **Kennzahlen-Kopf** (`SummaryStats`): Anzahl je Status, Summe offen/angenommen.
- **Status-Tabs** (`Tabs`): Entwurf / Gesendet / Angenommen / Abgelehnt / Alle (Zähler je
  Status), Standard = das Aktive.
- **Jahr-Umschalter** (`YearFilter`) fürs Archiv.
- **Gruppierung** nach Monat (Standard) mit Zwischensumme (`GroupedList`).
- **Verknüpfung sichtbar machen:** Zeile → Kunde/Job; „→ wurde zu Rechnung RE-2026-xxxx",
  wenn eine `invoices.offer_id` auf das Angebot zeigt (Rückwärts-Lookup in `useInvoices`/
  `useOffers` ergänzen).
- Tabelle in `Card`, einheitliche Aktions-Buttons (wie `InvoicesPage`).

## Stufe 3 — Rechnungen auf dieselbe Rezeptur + Dokument-Zeitstrahl

Datei: `src/pages/InvoicesPage.tsx` (Status-Tabs + offene Summe sind schon da). Ergänzen:
- **Jahr-Umschalter** + **Monats-Gruppierung** mit Zwischensumme.
- **Kennzahlen-Kopf** ausbauen (offen / überfällig / dieser Monat).
- **Verlaufs-Zeitstrahl je Rechnung** aus vorhandenen Daten abgeleitet (kein Schema nötig):
  erstellt (`created_at`) → gestellt (`invoice_date`/Nummer) → (Teil-)Zahlungen
  (`invoice_payments`) → bezahlt/storniert. Als Detail-Ansicht/Drawer je Rechnung.
- **Verknüpfung:** Zeile/Detail → Job, Ursprungs-Angebot, Kunde (anklickbar).

## Stufe 4 — Vorgangs-Verknüpfung: die „Insel" auflösen

Rechnungen dort zeigen, wo sie hingehören (heute nirgends außer der eigenen Seite).
- **Job-Detailseite** (`JobDetailPage.tsx`): neue `JobInvoicesCard` analog zur bestehenden
  `JobOffersCard` — Rechnungen am Job + Status/offener Betrag. Hook `useInvoicesForJob`.
- **Kunden-Detailseite** (`CustomerDetailPage.tsx`): Rechnungs-Abschnitt + „offener Betrag
  gesamt". Hook `useInvoicesForCustomer`.
- **Optional Event-Zeitstrahl** auf der Job-Seite: die Kette Anfrage → Angebot → Job →
  Rechnung als ein roter Faden.

## Stufe 5 — Export & Sammelaktionen (Feinschliff)

- **CSV-Export der gefilterten Liste** (Angebote/Rechnungen) über `exportToCsv` — Daten
  gehören dem Nutzer, öffenbar in Excel. (Später optional DATEV-Format.)
- **Optional Sammelaktionen:** mehrere markieren → Export bzw. Status.

---

## Offene Entscheidungen (mit Nutzer klären, bevor gebaut wird)

- **Gruppierung-Standard:** nach **Monat** oder nach **Kunde**? (Umschaltbar wäre ideal.)
- **Dokument-Detail:** eigene Unterseite oder **Seitenleiste/Drawer** über der Liste?
- **„Vorgang/Event"-Klammer:** reicht der **Job** als Klammer für Anfrage→Angebot→Rechnung,
  oder braucht es einen eigenen Vorgangs-Begriff? (Empfehlung: Job genügt vorerst.)

## Verifikation (pro Stufe)

1. `pnpm --filter @eventtech/web exec tsc --noEmit` · `pnpm lint` · `pnpm test` · `pnpm build` — grün.
2. Gruppier-/Jahres-/Summenlogik als Vitest-Unit-Tests.
3. Browser (Preview-MCP, `web-dev`, `admin@eventtech.local` / `EventTech2026!`): jede
   Ansicht lädt, Status-/Jahr-Filter + Gruppierung stimmen, Kennzahlen rechnen korrekt,
   Verknüpfungen navigieren richtig; mobil/desktop; keine Konsolen-Fehler; Testdaten danach
   aus der lokalen DB entfernen.

## Reihenfolge

1 (Bausteine) → 2 (Angebote) → 3 (Rechnungen + Zeitstrahl) → 4 (Verknüpfung) → 5 (Export).
Jede Stufe ist einzeln lieferbar und für sich ein sichtbarer Fortschritt. „Design-Stufe 4
Kalender" aus `PLAN-FABLE5.md` bleibt davon unberührt/separat.
