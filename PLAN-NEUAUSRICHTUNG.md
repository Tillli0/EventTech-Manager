# PLAN — Neuausrichtung: vom Verleih zum Event-Dienstleister

> **Großes Vorhaben** nach Skill `grosses-feature`. Dieses Dokument überlebt Sessions
> und trägt die Ausführung. **Stand: 2026-07-18** — E0 erledigt; **Block A Dokumente
> komplett: D1 (Fundament), D2 (DocumentsCard an Job + Kunde), D3 (zentrale Seite
> „Dokumente") und D4 (Auto-Archivierung erzeugter PDFs) live & bewiesen**; nächste
> Etappe **E1** (Bereich `anmietung` + Verleih-Partner, Block B). Nach jeder Etappe:
> Haken + Datum, Stand-Vermerk oben.
>
> Verhältnis zu den anderen Dokumenten: `ROADMAP.md` sagt WOHIN/Reihenfolge (dieses
> Vorhaben ist dort Phase 1 + 2), `CLAUDE.md` sagt WIE (Regeln/Rituale), hier stehen die
> **Details** (Warum, Entscheidungen, Schema, Etappen, Fallen).

---

## 1. Kontext — warum es dieses Vorhaben gibt

Till stellt sein Geschäftsmodell um (2026-07-17): Der Plan, eigene Technik zu besitzen
und zu vermieten, fällt weg. Künftig bleibt nur ein **kleines Rest-Inventar** (Mischpult,
BT-Box, Kleinkram); das Kerngeschäft wird, **Veranstaltungen zu planen und umzusetzen**
und die Technik dafür bei **fremden Verleihern anzumieten** — mal reine Technik-
Dienstleistung, mal umfassendere Event-Planung (auch fremde Gewerke wie Catering/
Transport). Die Software wandert damit vom **bestandszentrierten** System („was habe ich,
was ist frei?") zum **projektzentrierten** System („was braucht das Event, wo bekomme ich
es, was kostet es mich, wo liegt der Papierkram, was bleibt hängen?").

Tills zwei Kernwünsche:

1. **Anmietung „so umfänglich wie möglich"** — Anmiet-Vorgänge mit Status und einem
   Bestell-Dokument an den Verleiher; die angemietete Technik soll Engpässe in der
   Packliste real decken.
2. **Kalkulation „alles"** — je Job der **Deckungsbeitrag**: Erlös minus Anmietkosten,
   Personalkosten und sonstige Kosten. „Ich will bei jedem Job wissen, was ich verdiene."

Dazu ein **dritter, ebenso großer Schmerzpunkt**: das **Datei-Handling**. Gewünscht ist
ein geordneter Dokumenten-Ort („wie SharePoint"): Genehmigungen vom Amt, Baupläne der
Bühne, Rechnungen der Verleiher, Verträge — **alles an einem Ort**, sortiert, öffenbar,
mit dem sicheren Gefühl, dass nichts verloren geht; erzeugte Angebote/Rechnungen besser
benannt und dauerhaft abgelegt. Heute existieren nur zwei Datei-Inseln
(`device-photos` öffentlich, `device-documents` intern) + Meilenstein-Fotos; **kein**
Dokumenten-Ort am Job/Kunden, keine Kategorien, erzeugte PDFs werden nur
heruntergeladen und nirgends archiviert.

**Tills Entscheidungen (2026-07-17):**
- Automatisches Backup (ROADMAP P0.1) kommt **vor** allen Bau-Etappen (Sicherheitsnetz
  vor der größten Schema-Erweiterung seit dem Rechnungswesen).
- Der neue Bereich heißt **„Anmietung"**.
- Dokumenten-Ablage **am Vorgang + zentrale Gesamtsicht** (kein freier Ordnerbaum).
- Reihenfolge: **Backup → Dokumente → Anmietung**.
- Mobile Fußleiste: **Anmietung ersetzt Inventar** (Jobs · Kalender · Anmietung · Aufgaben).

## 2. Recherchierte Profi-Muster (Messlatte)

**Anmietung — Rentman / Current RMS:**
- Anmietung = **eigener Vorgang** je Lieferant + Zeitraum mit Positionen und eigener
  Status-Kette; **erhöht die Verfügbarkeit** im Zeitraum; Auslöser ist der **Engpass in
  der Packliste** („Subrent shortages"); Logistik-Art (Abholung / Lieferung Lager /
  Lieferung Location); neue Posten in bestehenden Vorgang bündelbar.
- **Purchase Orders** je Lieferant decken bei Current RMS auch **Freelancer-Personal**
  und **manuelle Kosten** (Hotel, Transport) ab; Kosten fließen **automatisch** in die
  Job-Kalkulation („Cost Overview": Kosten vs. Erlöse je Projekt).

**Dokumente — Rentman / lexoffice:** Dateien hängen am Vorgang (Projekt/Beleg) mit
Kategorie; erzeugte Dokumente werden automatisch archiviert; eine **zentrale, filterbare
Sicht** statt Ordnerbäumen — Ordnung entsteht strukturell, nicht durch Disziplin.

## 3. Zielbild (freigegebene Mockups, 2026-07-17)

Vier Ansichten in der App-Optik (dark, Indigo-Akzent) mit Till abgestimmt:

1. **Dokumente** — am Job als ruhige Tabellen-Karte mit **farbigen Kategorie-Kacheln**
   (Genehmigung=amber, Bauplan=blau, Eingangsrechnung=orange, Rechnung=grün, Vertrag=
   violett) + dezent getönte Badges; zentrale Seite mit **Kategorie-Spalte links**,
   Suche, Jahr-Filter, Monats-Gruppen, Vorgang-Verlinkung. Erzeugte PDFs erscheinen mit
   sprechendem Namen (`RE-2026-0043_Stadt-Musterstadt.pdf`) und `auto`-Badge.
2. **Job-Kalkulation** — Karte mit zwei Spalten **Kalkuliert / Abgerechnet**: Erlös −
   Anmietung − Personal − Sonstiges = Deckungsbeitrag, Marge-% mit Ampel (grün ab 30 %,
   amber 10–30 %, rot < 10 %). Darunter Kosten-Karte (Anmietung als read-only-Zeile aus
   den Vorgängen, Personal mit Stunden×Satz, „Zugewiesene übernehmen").
3. **Anmiet-Block am Job** — Vorgangs-Karten mit farbigem Status-Balken, Lieferant,
   AM-Nummer, Zeitraum/Logistik, Positionsliste (Katalog-Gerät oder Freitext), EK-Summe,
   Knöpfen Bestell-PDF/Dokumente/Anfrage-senden. In der Packliste Engpass-Hinweis mit
   Knopf **„Fehlmenge anmieten"**; gedeckte Posten zeigen „N eigen + M angemietet".
4. **Seite „Anmietung"** — Tabs **Anmietungen / Verleih-Partner**, Kennzahlen-Kopf
   (offen, EK offen, bestätigt, EK Jahr), Status-Tabs mit Zählern, Karten-Zeilen im
   Jobs-Look mit Vorgang-Verlinkung.

## 4. Entscheidungen (Status: ✔ fixiert / ○ offen)

- **✔ D1 Dokumente-Ablage:** ein **privater** Bucket `documents` (nie public!) + Tabelle
  `documents` mit Vorgangs-Bezug (`entity_type` + `entity_id`) und `category`. Öffnen
  über **signierte URLs**.
- **✔ D2 Sichtbarkeit folgt dem Vorgang:** SQL-Helfer `can_see_document(entity_type,
  entity_id)` mappt auf vorhandene Helfer (job → `can_see_job`, customer →
  `has_area('kunden')`, offer/invoice → `has_area('angebote')`, supplier/subrental →
  `has_area('anmietung')` — Verleiher-Eingangsrechnungen enthalten EK-Preise!).
- **✔ D3 Auto-Archivierung:** Rechnungs-PDF beim Stellen als `RE-2026-0001_<Kunde>.pdf`
  ablegen (GoBD-Archiv), Angebots-PDF beim Senden analog; Namens-Konvention als pure
  Funktion in `lib/documentNaming.ts` mit Test.
- **✔ F1 Anmiet-Modell:** Vorgangs-Kopf `subrentals` + Positionen `subrental_items`
  (nicht flach am Job) — die Bestell-Dokument-Klammer und die Status-Kette verlangen den
  Vorgang. `job_id` NOT NULL (job-übergreifende Sammelbestellung bewusst V2).
- **✔ F2 Verfügbarkeit:** nur Positionen **mit** `device_id` wirken; Konservativitäts-
  Symmetrie — Eigenbestand bindet ab `anfrage`, Anmiet-Zugänge zählen erst ab
  `bestaetigt`. Integration als **optionale Parameter** in `availableInRange()` /
  `checkAvailability()`, Additions-Hook global im Zeitraum (kein `excludeJobId`).
- **✔ F3 Kosten-Modell:** EINE generische Tabelle `job_costs` (Typ personal/transport/
  fremdleistung/sonstiges, optional `profile_id`, Komfort `hours`×`hourly_rate`,
  Wahrheit = `amount` netto). **Nie** Sätze an `profiles` (für alle lesbar) oder
  `job_assignees` (Selbst-Sicht-RLS). Anmietkosten NUR aus `subrental_items`.
- **✔ F4 Kalkulation:** zwei getrennte Erlös-Zahlen — **Kalkuliert** (angenommene
  Angebote) vs. **Abgerechnet** (gestellte Rechnungen, Storno raus), alles **netto**,
  nie mischen. Pure Funktion `lib/jobCosting.ts` + Test.
- **✔ F5 Bereich/Rechte:** neuer AppArea-Wert **`anmietung`**; Admin/Verwaltung
  automatisch via `is_manager()`; AdminPage rendert generisch über `APP_AREAS`.
- **✔ F6 Inventar-Zurückstufung / Nav:** nur Frontend-Gewichtung; BottomNav = Jobs ·
  Kalender · Anmietung · Aufgaben (Inventar via Sidebar).
- **○ E5 Bestell-Mail mit/ohne PDF-Anhang:** V1 ohne Anhang (Positionsliste im Text),
  Anhang als V2 (IDEAS). Vor Scharfschalten Freigabe.

## 5. Etappen

Reihenfolge & Abhängigkeiten: **P0.1 Backup** → Block A (D1→D2→D3→D4) → Block B
(E1→E2→E3/E4→E5; E6→E7; E8 zuletzt). Jede Etappe = eine Session, einzeln lieferbar, mit
vollem Ritual aus Skill `feature-fertigstellen`. Migrationsnummern erst beim Etappen-
Start endgültig vergeben (`ls supabase/migrations/ | tail` + `git fetch`); die Nummern
unten sind Planungs-Annahme ab 0038.

### Block A — Dokumente (ROADMAP-Phase 1)

**D1 ✅ — Bucket + Tabelle `documents` + RLS** (Migration 0038, erledigt 2026-07-17;
lokal + Cloud verifiziert: Bucket privat, RLS aktiv, `anon` ohne Zugriff, Deny/Allow je
Bereich bewiesen). Umgesetzt wie geplant, mit Zusatz-Feld `is_auto` (für D4) und zweitem
Helfer `can_edit_document`. `supplier`/`subrental` bewusst noch nicht im Check — folgen
mit Block B.
- Privater Bucket `documents`; Tabelle mit `entity_type` (job/customer/supplier/
  subrental/offer/invoice/company), `entity_id`, `category`, `title`, `file_name`,
  `storage_path`, `mime_type`, `size_bytes`, `notes`, `uploaded_by`, Zeitstempel.
- SQL-Helfer `can_see_document(...)`; RLS select/insert/update/delete darüber; **GRANTs**
  `authenticated` + `service_role`; Storage-Policies für den Bucket (kein `anon`).
- Aufsetzpunkt: RLS-/Bucket-Muster aus `0003_storage_buckets.sql` + `0012`.
- Beweis: psql — Upload-Zeile sichtbar nur mit passendem Bereich; Bucket **nicht** public
  (`select public from storage.buckets where id='documents'` → false).

**D2 ✅ — `DocumentsCard` + Upload-Hook** (keine Migration; erledigt 2026-07-18,
Browser-Beweis: Upload → signierte URL → PDF geöffnet → Löschen; Testdaten-Gegenprobe
0/0; Spalten-Layout erst ab `lg`, darunter kompakte Zeile)
- Wiederverwendbare `components/documents/DocumentsCard.tsx` (Props `entityType`,
  `entityId`, `allowedCategories`): Tabellen-Optik mit farbigen Kategorie-Kacheln,
  Upload (Drag/Drop), Öffnen über signierte URL, Löschen über `ConfirmDialog`.
- Hook `hooks/useDocuments.ts` (Key, Select je Entity, Upload/Delete-Mutation; Upload-
  Muster aus `useDevices.ts`/`JobMilestonesSection.tsx`). Signierte URL via
  `storage.from('documents').createSignedUrl(path, 60)`.
- Einbau an `JobDetailPage` und `CustomerDetailPage`.
- Beweis: Datei am Job hochladen, öffnen, löschen; mobil + Desktop; RLS-Probe.

**D3 ✅ — Zentrale Seite „Dokumente"** (keine Migration; erledigt 2026-07-18. Bereichslos
wie Aufgaben, RLS filtert zeilenweise; Kategorie-Spalte + Suche + Jahr + Monatsgruppen mit
Größen-Zwischensumme; `useAllDocuments` löst Job/Kunde je Zeile auf; `categoryMeta.tsx`
geteilt mit der Karte. Browser-Beweis: Upload → zentral sichtbar, Filter/Suche, Vorgang-Link)
- `pages/DocumentsPage.tsx`, Lazy-Route + `nav.ts`-Eintrag. Kategorie-Spalte links,
  Suche, `YearFilter`, Monats-Gruppen (`lib/listGrouping.ts`), Vorgang-Verlinkung.
  Sichtbar für alle eingeloggten Nutzer; RLS blendet zeilenweise aus (kein eigener
  Bereich — die Sicht aggregiert, was der Nutzer ohnehin sehen darf).
- Beweis: Filter/Suche/Jahr live, Links springen zum Vorgang.

**D4 ✅ — Auto-Archivierung erzeugter PDFs** (keine Migration; erledigt 2026-07-18)
- `lib/documentNaming.ts` (+ Test, 7 Fälle): `RE-2026-0001_<Kunde-slug>.pdf`,
  `AN-2026-9001_<Kunde-slug>.pdf` (Umlaut-Transliteration, Sonderzeichen → „-").
- `invoicePdf.tsx`/`offerPdf.tsx` liefern jetzt `renderInvoicePdfBlob`/`renderOfferPdfBlob`
  (Download nutzt sie weiter). `archiveInvoicePdf`/`archiveOfferPdf` in `useDocuments.ts`
  legen das PDF idempotent im privaten Bucket ab (`is_auto = true`), `storage_path` fest
  aus der Beleg-ID → Doppel-Aufruf erzeugt keine Dublette.
- **Wichtige Abweichung vom Entwurf (RLS-Korrektheit):** Belege docken am **eigenen
  Vorgang** (`entity_type` invoice/offer) an, NICHT am Job. Grund: `can_edit_document`
  für invoice/offer verlangt `can_edit_area('angebote')` — genau das Recht, das man zum
  Stellen/Senden ohnehin hat; am Job zu hängen bräuchte `jobs`-Schreibrecht (Insert würde
  für reine Finanz-Nutzer scheitern) und exponierte die Kunden-Rechnung jedem Job-
  Zugewiesenen. Damit die Belege trotzdem „am Vorgang" wirken, verlinkt `useAllDocuments`
  sie in der Gesamtsicht auf ihren Job (Fallback Kunde → Beleg-Nummer).
- Trigger: `InvoicesPage.handleIssue` nach dem Stellen; `CreateOfferDialog` nach dem
  Speichern, sobald das Angebot den Entwurf verlässt. Beide best-effort (Beleg bleibt
  gültig, wenn das Archiv scheitert) + invalidieren die `documents`-Query.
- **Storage-Falle (teuer):** `upload({ upsert: true })` scheitert an der Storage-Update-
  Policy (verlangt eine noch fehlende documents-Zeile) → `upsert: false`, „Datei existiert
  schon" (409) wird als Erfolg gewertet und nur die Zeile nachgelegt.
- Beweis (Browser + DB): Rechnung stellen → `RE-2026-0001_Milad.pdf` (3158 B) zentral mit
  `auto`-Badge, Kategorie „Rechnung", Vorgang-Link zum Job; signierte URL 200. Angebot auf
  „gesendet" → `AN-2026-9001_Milad.pdf`. Erneutes Speichern → weiterhin 1 Zeile/1 Datei
  (idempotent). Testdaten (inkl. Storage) restlos entfernt.

### Block B — Anmietung & Kalkulation (ROADMAP-Phase 2)

**E1 — Bereich `anmietung` + Verleih-Partner** (Migration 0039 **nur**
`alter type app_area add value 'anmietung'`; Migration 0040 `suppliers`)
- **ENUM-Falle:** `add value` und erste Nutzung strikt in **getrennten** Dateien.
- `suppliers` (name Pflicht, contact_person, email, phone, Adresse analog `customers`,
  website, notes, Zeitstempel); RLS `anmietung`; GRANTs; `on delete restrict` schützt
  Vorgänge.
- `types/database.ts` (AppArea-Union + `APP_AREAS` + `Supplier`), `hooks/useSuppliers.ts`,
  `pages/PurchasingPage.tsx` (`/anmietung`, Tab „Verleih-Partner"), `router.tsx`
  (`RequireArea('anmietung')`), `nav.ts` (Eintrag „Anmietung", Reihenfolge).
- Beweis: Partner anlegen/bearbeiten; Mitarbeiter ohne `anmietung` sieht weder Nav noch
  Seite; psql leere Selects ohne Bereich; Cloud-Verifikation.

**E2 — Anmiet-Vorgänge am Job** (Migration 0041 `subrentals` + `subrental_items`)
- `subrentals` (job_id NOT NULL, supplier_id, status entwurf/angefragt/bestaetigt/
  uebernommen/zurueckgegeben/storniert, start/end_date + Range-Check, logistics
  abholung/lieferung_lager/lieferung_location, order_number nullable + partieller
  Unique-Index, notes); `subrental_items` (subrental_id, device_id nullable,
  description Pflicht, quantity > 0, unit_cost netto je Stück für den Gesamtzeitraum,
  sort_order).
- `lib/subrentals.ts` (Status-Kette, `subrentalTotals`) + Test; `hooks/useSubrentals.ts`;
  `components/jobs/JobSubrentalsCard.tsx` (Muster `JobInvoicesCard`); Anmiet-Dialog;
  PurchasingPage-Tab „Anmietungen" (Status-Tabs, SummaryStats).
- Beweis: Vorgang mit Katalog- + Freitext-Position, Status-Kette, Summen; RLS-Probe.

**E3 — Verfügbarkeits-Zugänge** (keine Migration)
- `lib/availability.ts` + optionale Parameter + `SUBRENTAL_COUNTING_STATUSES`
  (`bestaetigt`/`uebernommen`/`zurueckgegeben`); Alt-Tests bleiben grün, neue Fälle dazu.
- `useSubrentalAdditionsMap(start, end)` (Muster `useDevicesAvailabilityMap`), global im
  Zeitraum. `PacklistSection.tsx`: Warntext „Nur N von M frei — davon +X angemietet",
  Knopf „Fehlmenge anmieten" (öffnet Anmiet-Dialog vorbefüllt; nur mit
  `can_edit_area('anmietung')`).
- Beweis (Vitest + Browser): Bestand 2, Bedarf 5 → „3 fehlen"; Anmietung 3 auf
  `bestaetigt` → Warnung weg; zurück auf `angefragt` → Warnung wieder da.

**E4 — Bestell-PDF** (keine Migration)
- `lib/subrentalOrderPdf.tsx` (Muster `offerPdf.tsx`) + `components/documents/
  SubrentalOrderPdfDocument.tsx` (Muster `OfferPdfDocument`): Briefkopf, Empfänger =
  Lieferant, „Mietanfrage/Bestellung AM-2026-…", Zeitraum, Logistik, Positionen mit EK,
  Netto-Summe. AM-Nummern client-seitig max+1 mit Retry (AN-Muster), partieller
  Unique-Index als Netz; **kein** Advisory-Lock (nicht GoBD-pflichtig).
- Optional: erzeugtes PDF via D2 am Vorgang ablegen.
- Beweis: PDF mit echten Firmendaten; Doppel-Klick-Nummern-Probe.

**E5 — Bestell-Mail an Verleiher** (Migration 0042 `subrental_order_emails`;
„ruhig by default")
- Edge Function `supabase/functions/send-subrental-order` (Muster `send-dunning`):
  JWT-Pflicht + `can_edit_area('anmietung')`, **Preview-Pflicht** vor Versand, Resend nur
  mit `RESEND_API_KEY` (sonst klare Fehlermeldung), Protokoll-Insert per service_role.
  Erfolg setzt Status auf `angefragt`. V1 ohne PDF-Anhang.
- `supabase/config.toml`-Eintrag; Versand-Dialog mit Pflicht-Vorschau.
- Beweis: Preview lokal, Fehlerpfad ohne Key, psql-Probe Protokoll nur service_role.
  **Function-Deploy nur nach ausdrücklicher Freigabe.**

**E6 — Kosten am Job** (Migration 0043 `job_costs`)
- `job_costs` (job_id, cost_type, profile_id nullable, description Pflicht, hours/
  hourly_rate nullable, amount netto, cost_date nullable); RLS `anmietung`; GRANTs.
- `types/database.ts`, `hooks/useJobCosts.ts`, `components/jobs/JobCostsCard.tsx`
  (Typ-Badges, Stunden×Satz-Rechner → amount, read-only-Zeile „Anmietungen aus
  Vorgängen", Knopf „Zugewiesene übernehmen"). Guard `hasArea('anmietung')`.
- Beweis: alle Typen, Rechner, Summen; Rechte-Probe (ohne Bereich Karte unsichtbar).

**E7 — Kalkulation** (keine Migration)
- `lib/jobCosting.ts` + Test: `computeJobCosting({ offers, invoices, subrentals, costs })`
  → revenueQuoted/revenueInvoiced|null, costSubrental/Personal/Other/Total,
  marginQuoted/marginInvoiced|null, marginPct. Erlös netto, Rechnungen `isIssued` &&
  nicht storniert.
- `components/jobs/JobCostingCard.tsx` (Seitenspalte JobDetailPage); `lib/reports.ts` +
  Test erweitern (DB je Monat, Jahres-Kosten); ReportsPage-Karten „Deckungsbeitrag",
  „Top-Jobs nach DB" — **nur** bei `hasArea('anmietung')`.
- Beweis: Testjob Angebot 1.000 netto − Anmietung 300 − Personal 200 → DB 500, 50 %;
  Rechnung stellen → Ist-Spalte füllt sich.

**E8 — Dashboard & Navigation neu gewichten** (keine Migration)
- `nav.ts` (Reihenfolge + BottomNav Jobs·Kalender·Anmietung·Aufgaben);
  `DashboardPage.tsx` (KPI „Offene Anmietungen", Karte „Anmietungen mit Handlungsbedarf",
  Geräte-Karten nach unten; rollenabhängige KPI).
- Beweis: 375px + Desktop; Rollen-Sichten intakt.

**E9 (Folge-Backlog)** — Engpass-Sammelansicht über alle Jobs + InventoryPage-Badge
„+X angemietet". In IDEAS/ROADMAP-Phase 4.

## 6. Schema-Kurzentwürfe

Alle nach Skill `db-migration`: Kommentar-Kopf mit Begründung, `set_updated_at`-Trigger,
Indizes auf FKs, RLS-Vierergespann, **explizite GRANTs** (`authenticated` +
`service_role`, nie `anon`), `notify pgrst, 'reload schema'`.

- `documents(id, entity_type text check(...), entity_id uuid, category text check(...),
  title text, file_name text, storage_path text unique, mime_type text, size_bytes
  bigint, notes text, uploaded_by uuid → profiles, created_at, updated_at)`
- `suppliers(id, name text not null check(<>''), contact_person, email, phone, street,
  zip, city, website, notes, created_at, updated_at)`
- `subrentals(id, job_id → jobs on delete cascade, supplier_id → suppliers on delete
  restrict, status text check(...), start_date, end_date check(end>=start), logistics
  text check(...), order_number text, notes, created_at, updated_at)` +
  `unique(order_number) where order_number is not null`
- `subrental_items(id, subrental_id → subrentals on delete cascade, device_id → devices
  on delete set null, description text not null, quantity int check(>0), unit_cost
  numeric(10,2), sort_order int, created_at, updated_at)`
- `job_costs(id, job_id → jobs on delete cascade, cost_type text check(...), profile_id
  → profiles on delete set null, description text not null, hours numeric(6,2),
  hourly_rate numeric(8,2), amount numeric(10,2) not null, cost_date date, created_at,
  updated_at)`
- `subrental_order_emails(id, subrental_id → subrentals on delete cascade, sent_to,
  subject, body, sent_by → profiles, sent_at)` — RLS select `has_area('anmietung')`,
  KEINE Schreib-Policy für `authenticated`, `grant all` nur `service_role`.

## 7. Risiken & Fallen

1. **ENUM-Transaktions-Falle (größtes Risiko):** `alter type app_area add value` und die
   erste **Nutzung** des Werts (Policy/Funktion) müssen in **getrennten** Migrationsdateien
   stehen — die Cloud-Pipeline führt jede Datei in einer Transaktion aus („unsafe use of
   new value"). Lokal via psql (Autocommit) tritt der Fehler NICHT auf → würde erst die
   Cloud-Action brechen.
2. **GRANTs vergessen** → still leere Daten/403. Schablone in jeder Migration; `anon`
   bleibt leer (0030-Härtung).
3. **Dokumente-Bucket versehentlich public** (wie `device-photos`) → Genehmigungen/
   Eingangsrechnungen wären öffentlich lesbar. Bucket privat + signierte URLs; im
   DB-Beweis `public=false` verifizieren.
4. **RLS-Datenschutz:** Stundensätze/EK-Preise nie an `profiles` (alle `authenticated`
   lesen, 0012) oder `job_assignees` (Selbst-Sicht-RLS, `jobs_sel` hängt daran) hängen;
   Verleiher-Eingangsrechnungen nur für `anmietung`.
5. **Kalkulations-Null-Falle:** ohne `anmietung`-Recht liefert RLS leere Kosten → eine
   trotzdem gerenderte Kalkulation zeigte fälschlich 100 % Marge. UI-Guard
   `hasArea('anmietung')` vor Kalkulations-/Kosten-/Anmiet-Karten und Report-Margen.
6. **availability-Aufrufer nicht brechen:** nur optionale Parameter anhängen; Alt-Tests
   unverändert als Regressionsnetz.
7. **Storage-Backup:** P0.1 muss den `documents`-Bucket einschließen — sonst ist „nichts
   geht verloren" nicht wahr.
8. **Storno-Job ≠ Auto-Storno der Anmietung** (realer Vertrag) → Warn-Badge „Job
   storniert — Anmietung prüfen"; Anmiet-Zähler/Listen filtern `jobs.deleted_at is null`,
   Verfügbarkeits-Zugänge zählen rein nach Subrental-Status.
9. **`on delete restrict` bei suppliers:** Löschversuch mit Vorgängen scheitert
   absichtlich — verständlicher UI-Fehlertext.
10. **Werkzeug-Rituale:** Vitest **v2** behalten; ESLint `--max-warnings 0`; NBSP in
    Tests nur als ` `-Escape; `@react-pdf/renderer` nur per dynamischem Import.
11. **Nach-außen-Wirkendes** (Bestell-Mail) strikt „ruhig by default": kein Deploy/Key
    ohne Freigabe; Preview-Pflicht; Protokoll nur service_role.

## 8. Verlauf

- **2026-07-17:** Vorhaben angestoßen (Geschäftsmodell-Wende). IST-Zustand erhoben,
  Profi-Muster recherchiert, 6 Design-Fragen + Dokumenten-Fragen mit Till geklärt, vier
  Zielbild-Mockups freigegeben (Dokumente in seriöser Tabellen-Optik mit farbigen
  Kategorien). Kompass umgestellt (dieses Dokument, ROADMAP, CLAUDE.md, IDEAS.md).
  Nächster Schritt: P0.1 automatisches Backup, dann Block A (Dokumente).
- **2026-07-18:** Block A abgeschlossen. D1–D3 gebaut & bewiesen. **D4** (Auto-Archivierung)
  fertig: erzeugte Rechnungs-/Angebots-PDFs landen beim Stellen/Senden idempotent im
  Dokumente-Archiv (`RE-…_<Kunde>.pdf` / `AN-…_<Kunde>.pdf`). RLS-bedingt am eigenen Beleg-
  Vorgang statt am Job (in der Gesamtsicht zum Job verlinkt). Nächster Schritt: **E1**
  (Bereich `anmietung` + Verleih-Partner) — Beginn von Block B.
