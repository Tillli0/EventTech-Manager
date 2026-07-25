# PLAN — Neuausrichtung: vom Verleih zum Event-Dienstleister

> **Großes Vorhaben** nach Skill `grosses-feature`. Dieses Dokument überlebt Sessions
> und trägt die Ausführung. **Stand: 2026-07-25** — E0 + Block A (Dokumente) komplett;
> **E1 (Bereich `anmietung`), E2 (Anmiet-Vorgänge am Job) und E3 (Verfügbarkeits-
> Zugänge) live & bewiesen**; **E2b (KI-Dokumenten-Extraktion) technisch lauffähig**
> (Gemini-Key gesetzt, Modell-Fix `gemini-flash-latest` statt gesperrtem
> `gemini-2.5-flash`, lokal mit echtem PDF fehlerfrei getestet), **aber inhaltliche
> Qualität der Erkennung noch unzureichend** (Till: „inhaltlich eine Katastrophe") —
> Prompt/Extraktion braucht Nacharbeit, bevor scharf geschaltet wird. Bewusst **nicht
> deployt**, auf Eis gelegt zugunsten der nächsten Etappen. **E4 (Bestell-PDF) live &
> bewiesen. E5 (Bestell-Mail an Verleiher) lokal fertig, Edge Function
> `send-subrental-order` bewusst NICHT deployt UND der Knopf „Bestell-Mail senden" in
> der Oberfläche seit 2026-07-25 explizit ausgeblendet** (Konstante
> `SUBRENTAL_ORDER_MAIL_ENABLED = false` in `JobSubrentalsCard.tsx`) — Till will das
> erst scharf schalten, wenn er bereit ist; Code/Dialog bleiben unverändert für den
> späteren Schalter. **E6 (Kosten am Job) live & bewiesen. E7 (Job-Kalkulation +
> ReportsPage-Auswertung „Deckungsbeitrag"/„Top-Jobs") komplett live & bewiesen. E8
> (Dashboard & Navigation) live & bewiesen — Block B ist damit im Kern komplett.**
> **E2b-Erweiterung (Kategorie an Anmiet-Positionen + KI-Kategorie-Erkennung) gebaut
> 2026-07-25** (Migration 0046) — Prüfkette + DB-Beweis grün, **kein Browser-Beweis
> diese Session** (kein Preview-Werkzeug verfügbar). **E10 (Eigentümer-Feld am Gerät)
> ebenfalls gebaut 2026-07-25** (Migration 0047) — gleicher Stand: Prüfkette +
> DB-Beweis grün, kein Browser-Beweis diese Session. Damit sind beide am 2026-07-25
> angestoßenen Etappen umgesetzt; als Nächstes steht wieder **E2b** (Prompt-Qualität
> der KI-Extraktion) oder ein neues Vorhaben an. Nach jeder Etappe: Haken + Datum,
> Stand-Vermerk oben.
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
- **✔ E2b KI-Dokumenten-Extraktion:** Anbieter **Google Gemini API, kostenlose Stufe**
  (Till entschieden 2026-07-24, statt bezahlter Anthropic-API). Upload geht **sowohl
  beim Neu-Anlegen als auch nachträglich an einem bestehenden Anmiet-Vorgang** (z. B.
  Rechnung reicht Endpreise nach). Architektur anbieter-abstrahiert (eine Edge Function
  als Fassade), damit ein Wechsel später billig bleibt.

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

**E1 ✅ — Bereich `anmietung` + Verleih-Partner** (erledigt 2026-07-24; Migration 0040
**nur** `alter type app_area add value 'anmietung'`, Migration 0041 `suppliers` —
Nummern 0039/0040 aus der Planungs-Annahme waren durch `personal_blocks` inzwischen
belegt, real vergeben wurden 0040/0041)
- **ENUM-Falle** eingehalten: `add value` steht allein in 0040, `suppliers` + jede
  Nutzung des Werts erst in 0041 (Präzedenz `0034_job_status_workflow.sql`).
- `suppliers` (name Pflicht, contact_person, email, phone, Adresse analog `customers`,
  website, notes, Zeitstempel, `idx_suppliers_name_trgm`); RLS-Vierergespann auf
  `has_area`/`can_edit_area('anmietung')`; GRANTs `authenticated` + `service_role`.
  **Kein** `on delete restrict` in E1 — der FK von `subrentals` kommt erst mit E2.
- `types/database.ts` (`AppArea`-Union + `APP_AREAS` + `Supplier`) — AdminPage-Rechte-UI
  und Nutzer-anlegen-Dialog übernehmen den neuen Bereich automatisch (beide iterieren
  generisch über `APP_AREAS`, keine eigene Änderung nötig).
- `hooks/useSuppliers.ts` (Muster: Kategorie-Block in `useDevices.ts`),
  `pages/PurchasingPage.tsx` (`/anmietung`, Tabs „Anmietungen"/„Verleih-Partner" —
  Anmietungen-Tab noch Platzhalter für E2), `components/suppliers/SupplierListView.tsx`
  + `CreateSupplierDialog.tsx` (Muster `CustomersPage`/`CreateCustomerDialog`),
  `router.tsx` (`RequireArea('anmietung')`), `nav.ts` (Eintrag „Anmietung" in Gruppe
  „Kaufmännisch" — Fußleiste bewusst unverändert, das Umgewichten ist E8).
- Beweis: Prüfkette grün (tsc/lint/108 Tests/Build). DB: `enum_range` enthält
  `anmietung`; RLS-Probe mit Max Deger (mitarbeiter) — ohne Bereich 0 sichtbare Zeilen
  + Insert von RLS geblockt, mit testweise vergebenem Bereich Insert/Select erfolgreich,
  Testdaten + Test-Rechte danach restlos entfernt. Browser (Preview-MCP): als Max weder
  Nav-Eintrag noch Seite (`RequireArea` zeigt „Kein Zugriff auf diesen Bereich"); als
  Admin Partner angelegt, bearbeitet, gelöscht — Konsole fehlerfrei, 375px + Desktop.

**E2 ✅ — Anmiet-Vorgänge am Job** (erledigt 2026-07-24; Migration 0042 `subrentals` +
`subrental_items` — Plan-Annahme 0041 war durch Migration 0041 `suppliers` aus E1
bereits belegt, real vergeben wurde 0042)
- `subrentals` (job_id NOT NULL, supplier_id, status entwurf/angefragt/bestaetigt/
  uebernommen/zurueckgegeben/storniert, start/end_date + Range-Check, logistics
  abholung/lieferung_lager/lieferung_location, order_number nullable + partieller
  Unique-Index, notes); `subrental_items` (subrental_id, device_id nullable,
  description Pflicht, quantity > 0, unit_cost netto je Stück für den Gesamtzeitraum,
  sort_order). **Bewusst ohne** `updated_at` auf `subrental_items` — Positionen werden
  bei Änderung komplett ersetzt (delete+insert), analog `offer_items`/`invoice_items`.
  RLS direkt auf `has_area`/`can_edit_area('anmietung')` (kein Job-Sichtbezug — wer
  Anmietung sehen/bearbeiten darf, sieht alle Vorgänge, wie bei `suppliers`).
- `lib/subrentals.ts` (`SUBRENTAL_STATUS_OPTIONS`, `subrentalTotals`, 6 Tests);
  `hooks/useSubrentals.ts`; `components/jobs/JobSubrentalsCard.tsx` (Muster
  `LinkedFinanceCards`) im Tab „Material" neben der Packliste; `CreateSubrentalDialog.tsx`
  (Muster `CreateOfferDialog`, Katalog-Gerät ODER Freitext); `PurchasingPage`-Tab
  „Anmietungen" (`SubrentalListView.tsx`, SummaryStats + Status-Tabs, Vorgang-Verlinkung
  zum Job) ersetzt den E1-Platzhalter. `order_number` bleibt vorerst ungenutzt (nullable) —
  Vergabe erst mit der Bestell-PDF-Erzeugung in E4.
- Beweis: Prüfkette grün (tsc/lint/114 Tests/Build). DB: RLS-Probe mit Max Deger (ohne
  Bereich 0 sichtbare Zeilen + Insert geblockt; mit testweise vergebenem Bereich
  Vorgang + Position anlegbar/lesbar über den Join), Testdaten + Test-Rechte restlos
  entfernt (der echte Verleih-Partner „Beuchel" blieb unangetastet). Browser: Vorgang
  mit Katalog- (DMX Kabel) + Freitext-Position angelegt, Summe korrekt (25,50 € +
  4×3,20 € = 38,30 €), Status-Wechsel Entwurf→Bestätigt aktualisiert Zähler/Summen auf
  der Anmietung-Seite live, Löschen entfernt den Vorgang; 375px + Desktop, Konsole
  fehlerfrei.

**E2b 🔧 — KI-Dokumenten-Extraktion für Anmiet-Vorgänge** (gebaut + lokal bewiesen
2026-07-24, Migration 0043 `documents`-Erweiterung um supplier/subrental; **Edge
Function noch NICHT deployt** — braucht Tills Gemini-API-Key als Supabase-Secret +
ausdrückliche Freigabe zum Scharfschalten, s. u.)

Tills Bauchgefühl: manuelles Abtippen von Verleiher-Angeboten/-Rechnungen nervt. Wunsch:
PDF hochladen → Positionen (Gerät/Menge/Preis) automatisch ins Formular, kurz prüfen,
speichern. **Recherche-Ergebnis:** Rentman/Current RMS lösen das NICHT automatisch
(nur manuell/CSV-Import) — kein Profi-Muster zum Abschauen, dafür die allgemeine
Technik aus der Beleg-Erkennung (lexoffice/sevDesk-Scan-Prinzip, nur mit einem
Vision-fähigen KI-Modell statt klassischem OCR: 95–99 % Trefferquote laut aktuellen
Erfahrungsberichten, direktes PDF-Verständnis inkl. Scans).

- **Neu für dieses Projekt:** erste Anbindung an eine externe KI-API. Schema-seitig nur
  eine kleine Erweiterung: `documents.entity_type`-Check + `can_see_document`/
  `can_edit_document` um `supplier`/`subrental` ergänzen (in 0038 bereits als „kommt mit
  Block B" vorgesehen) — damit das hochgeladene PDF zusätzlich automatisch am Vorgang
  archiviert werden kann (Kategorie `eingangsrechnung`/`angebot`).
- **Edge Function** `extract-subrental-document` (Muster `send-dunning`: JWT-Pflicht +
  `can_edit_area('anmietung')`): nimmt das PDF (base64), schickt es mit festem
  JSON-Schema-Prompt an den gewählten KI-Anbieter, gibt `{ supplier_name_guess,
  start_date_guess, end_date_guess, items: [{description, quantity, unit_cost}] }`
  zurück. **„Ruhig by default"**: ohne gesetzten API-Key klare Fehlermeldung, keine
  App-Funktion hängt daran — manuelle Eingabe geht immer.
- **Frontend:** `CreateSubrentalDialog.tsx` bekommt oben ein Upload-Feld („PDF
  hochladen"), verfügbar **sowohl beim Neu-Anlegen als auch beim Bearbeiten** eines
  bestehenden Vorgangs (Tills Entscheidung); nach Extraktion befüllt sich das
  bestehende Formular (Partner-Fuzzy-Match gegen `suppliers` clientseitig — kein
  Treffer zeigt einen Hinweis statt zu raten, Zeitraum, Positionsliste als Freitext,
  `device_id` bleibt null) — **bleibt voll editierbar**, kein Blindvertrauen. Kein
  neuer Persistenz-Pfad nötig — Speichern läuft weiter über
  `useCreateSubrental`/`useUpdateSubrental` wie bisher; das hochgeladene PDF wird
  danach best-effort am Vorgang archiviert (Kategorie `eingangsrechnung`, D4-Muster).
- **Model:** `gemini-2.5-flash` (env `GEMINI_MODEL` überschreibbar), Aufruf über
  `generateContent` mit `responseSchema` für garantiert strukturiertes JSON.
- Beweis (2026-07-24, lokal): Prüfkette grün (tsc/lint/114 Tests/Build). DB: erweiterte
  `can_see_document`/`can_edit_document` per RLS-Probe mit Max Deger bewiesen (ohne
  Bereich `false`/`false` für `supplier`+`subrental`, mit Bereich `true`/`true`,
  Test-Rechte danach entfernt). Function (nach `supabase stop && supabase start`) per
  echtem Login+Token aufgerufen: ohne `GEMINI_API_KEY` liefert sie die erwartete
  „ruhig by default"-Fehlermeldung, kein stiller Fehlschlag. Browser: Upload-Bereich im
  Dialog rendert korrekt (Create + Edit), Konsole fehlerfrei, 375px + Desktop.
  **Noch nicht bewiesen: die echte Extraktion mit einem echten Gemini-Key gegen ein
  reales Verleiher-PDF** — das braucht Tills eigenen, kostenlosen API-Key
  (aistudio.google.com) und den Deploy der Function; beides **nur nach ausdrücklicher
  Freigabe**, da nach-außen-wirkend (externe API, Kosten wenn auch minimal).

**E3 ✅ — Verfügbarkeits-Zugänge** (erledigt 2026-07-25; keine Migration)
- `lib/availability.ts`: `SUBRENTAL_COUNTING_STATUSES` (`bestaetigt`/`uebernommen`/
  `zurueckgegeben`) + `countsAsSubrentalAddition()`; `availableInRange`/
  `checkAvailability` um optionalen `subrentalAdditions`-Parameter erweitert — fließt
  VOR dem Nullpunkt-Deckel ein (echte Zusatzkapazität gegen Fremdbuchungen, nicht nur
  additiv auf ein schon gedeckeltes „frei"). `AvailabilityCheck.subrentalAdditions`
  neu, für die Anzeige. 8 neue Tests, alle 9 Alt-Tests unverändert grün.
- `useSubrentalAdditionsMap(start, end)` in `hooks/useSubrentals.ts` (Muster
  `useDevicesAvailabilityMap`) — bewusst **ohne** `excludeJobId` (Symmetrie-Bruch
  gewollt: eine für genau diesen Job angelegte Anmietung soll für ihn selbst zählen).
  Nur Positionen **mit** `device_id`, nur zählende Status, Zeitraum-Überlappung über
  die reinen `date`-Spalten von `subrentals` (Tagesanteil abgeschnitten, sonst
  Zeitanteil-Koerzierung bei Randtagen inkonsistent).
- `PacklistSection.tsx` (`PlanungStage`/`PlanungRow`): Warntext „Nur N von M frei (X
  fehlen) — davon +X angemietet"; gedeckte Posten zeigen ruhig „davon +X angemietet";
  Knopf „Fehlmenge anmieten" (nur mit `can_edit_area('anmietung')`) öffnet
  `CreateSubrentalDialog` vorbefüllt (neue `presetItem`-Prop, Muster `presetItems` bei
  `CreateOfferDialog`) mit Gerät + exakter Fehlmenge.
- Beweis: Prüfkette grün (tsc/lint/120 Tests/Build). Browser mit Testdaten (TEST-Job,
  Bestand 12, Bedarf 15): „Nur 12 von 15 im Zeitraum frei (3 fehlen)" + Knopf; Dialog
  vorbefüllt mit „DMX Kabel" × 3; Anmietung auf `bestaetigt` → Warnung weg, „davon +3
  angemietet" erscheint; zurück auf `angefragt` → Warnung wieder da (exakt das
  geforderte Szenario). 375px + Desktop, Konsole fehlerfrei, Testdaten restlos entfernt.

**E4 — Bestell-PDF** (keine Migration)
- `lib/subrentalOrderPdf.tsx` (Muster `offerPdf.tsx`) + `components/documents/
  SubrentalOrderPdfDocument.tsx` (Muster `OfferPdfDocument`): Briefkopf, Empfänger =
  Lieferant, „Mietanfrage/Bestellung AM-2026-…", Zeitraum, Logistik, Positionen mit EK,
  Netto-Summe. AM-Nummern client-seitig max+1 mit Retry (AN-Muster), partieller
  Unique-Index als Netz; **kein** Advisory-Lock (nicht GoBD-pflichtig).
- Optional: erzeugtes PDF via D2 am Vorgang ablegen.
- Beweis: PDF mit echten Firmendaten; Doppel-Klick-Nummern-Probe.

**E5 🔧 — Bestell-Mail an Verleiher** (Migration 0044 `subrental_order_emails`,
gebaut + lokal bewiesen, Function bewusst NICHT deployt — „ruhig by default")
- Edge Function `supabase/functions/send-subrental-order` (Muster `send-dunning`):
  JWT-Pflicht + `can_edit_area('anmietung')`, **Preview-Pflicht** vor Versand, Resend nur
  mit `RESEND_API_KEY` (sonst klare Fehlermeldung), Protokoll-Insert per service_role.
  Voraussetzung: Bestellnummer muss bereits vergeben sein (E4 zuerst) — sonst klare
  Fehlermeldung statt automatischer Vergabe (die Nummernlogik lebt bewusst nur im
  Frontend, s. E4). Erfolg setzt Status nur beim ERSTEN Anschreiben von `entwurf` auf
  `angefragt` (späteres Nachfassen darf einen weiter fortgeschrittenen Status nicht
  zurückdrehen). V1 ohne PDF-Anhang.
- `supabase/config.toml`-Eintrag; Versand-Dialog (`SendSubrentalOrderDialog.tsx`) mit
  Pflicht-Vorschau, Knopf „Bestell-Mail senden" an der Anmiet-Vorgangs-Karte (nur
  sichtbar, wenn bereits eine Bestellnummer vergeben wurde).
- Beweis: Preview lokal (mit echter Partner-Mail testweise, danach entfernt),
  Fehlerpfad ohne Partner-E-Mail UND ohne RESEND_API_KEY (beide klare Fehlermeldungen,
  kein Versand, kein Protokoll-Eintrag — per psql geprüft). **Function-Deploy nur nach
  ausdrücklicher Freigabe.**
- **2026-07-25 (Nachtrag):** Till will die Mail-Funktion vorerst **nicht** scharf
  schalten. Der Grund, warum das mehr als „nichts tun" braucht: der Frontend-Code
  war durch den normalen Push bereits automatisch in der echten (Cloud-)App live —
  nur die Funktion dahinter fehlte dort. Ein Klick hätte dort also nicht „ruhig"
  gescheitert, sondern mit einer unschönen technischen Fehlermeldung. Deshalb
  zusätzlich der Knopf „Bestell-Mail senden" per Konstante
  `SUBRENTAL_ORDER_MAIL_ENABLED = false` in `JobSubrentalsCard.tsx` ausgeblendet —
  Dialog/Hooks/Function bleiben unverändert, Umschalten später ist ein Ein-Zeilen-Fix.

**E6 ✔ — Kosten am Job** (Migration 0045 `job_costs`, erledigt 2026-07-25)
- `job_costs` (job_id, cost_type, profile_id nullable, description Pflicht, hours/
  hourly_rate nullable, amount netto, cost_date nullable); RLS `anmietung`; GRANTs.
- `types/database.ts`, `hooks/useJobCosts.ts`, `components/jobs/CreateJobCostDialog.tsx`,
  `components/jobs/JobCostsCard.tsx` (Typ-Badges, Stunden×Satz-Rechner → amount
  read-only sobald beide gesetzt, read-only-Zeile „Anmietungen aus Vorgängen" (Summe
  aktiver, nicht stornierter Anmiet-Vorgänge), Knopf „Zugewiesene übernehmen" — legt je
  zugewiesenem Nutzer ohne bestehende Personal-Zeile eine leere Zeile an, Admin-Profile
  bewusst ausgeschlossen wie bei der Job-Zuweisung selbst). Karte im Job-Tab „Geld".
  Guard `hasArea('anmietung')` (Sichtbarkeit) / `canEdit('anmietung')` (Bearbeiten).
- Beweis: Rechner (8 Std. × 25 € → 200 €), Summen (Anmietung 2.000 € + Personal 200 €
  = 2.200 €), Zugewiesene-übernehmen (2 Zeilen für 2 zugewiesene Nutzer, Admin
  korrekt ausgeschlossen), Löschen (Button „Zugewiesene übernehmen" taucht danach
  wieder auf), alles im Browser durchgespielt und per psql gegengeprüft. Rechte-Probe
  als Logik-Check (kein Live-Login als Nicht-Bereichs-Nutzer): realer Nutzer „Max
  Deger" ohne Bereich `anmietung` und ohne Admin-Rolle → `has_area('anmietung')`
  liefert `false`, Karte bliebe unsichtbar. Testdaten restlos entfernt (`job_costs`
  wieder leer).

**E7 ✔ — Kalkulation** (keine Migration; komplett erledigt 2026-07-25)
- ✔ `lib/jobCosting.ts` + Test: `computeJobCosting({ offers, invoices, subrentals, costs })`
  → revenueQuoted/revenueInvoiced|null, costSubrental/Personal/Other/Total,
  marginQuoted/marginInvoiced|null, marginPctQuoted/marginPctInvoiced|null. Erlös
  netto (`offerTotals`, wiederverwendet für Angebote UND Rechnungen — gleiche
  Positions-Form), Rechnungen über `isIssued` (jetzt aus `lib/reports.ts` exportiert)
  && Status `gestellt` (schließt storniert automatisch aus).
- ✔ `components/jobs/JobCostingCard.tsx` (Seitenspalte JobDetailPage, immer sichtbar
  wie die Status-Karte — nicht ans „Geld"-Tab gebunden). Zwei Spalten Kalkuliert/
  Abgerechnet, Marge-Ampel über bereits vorhandenes `marginLevel`/`levelTone` aus
  `statusTone.ts` (grün ≥30 %, amber 10–30 %, rot <10 %, neutral wenn nicht
  berechenbar). Guard `hasArea('anmietung')`.
- ✔ `lib/reports.ts` erweitert: `jobMargins()` aggregiert `computeJobCosting()` über
  alle Jobs (Ist-Marge aus gestellter Rechnung bevorzugt vor Soll-Marge aus
  angenommenem Angebot; Jobs ohne echte Grundlage — kein angenommenes Angebot, keine
  gestellte Rechnung, keine Anmietung/Kosten — fallen raus, sonst würden sie als
  „0 €"-Zeilen die Rangliste verwässern), `topJobsByMargin()`, `marginByMonth()`
  (Job zählt komplett im Monat seines Startdatums, Muster `jobsByMonth`). 6 neue
  Tests. Neue Sektionen **direkt in der bestehenden Auswertungen-Seite** (kein neuer
  Tab/keine neue Seite nötig — passt als zusätzlicher Block rein, genau wie die
  anderen Auswertungs-Karten dort): „Deckungsbeitrag je Monat" (Balkendiagramm) und
  „Top-Jobs nach Deckungsbeitrag" (Rangliste mit Marge-Ampel, verlinkt zum Job) — nur
  bei `hasArea('anmietung')`.
- Beweis: exaktes Plan-Szenario (Angebot 1.000 netto − Anmietung 300 − Personal 200 →
  DB 500, 50 %) als Vitest-Test nachgebildet (3 Tests: Kern-Rechnung, „Rechnung stellen
  füllt Ist-Spalte", Storno/nicht-angenommen werden ignoriert) — alle grün. Browser-
  Beweis mit echten Live-Daten am Job „KEssi" (Anmietung 2.000 €, kein angenommenes
  Angebot, keine gestellte Rechnung): Karte zeigt Erlös 0 €, Anmietung −2.000 €, DB
  −2.000 €, Badge „—" (kein Prozentwert bei Erlös 0, korrekt statt Division durch 0),
  „Abgerechnet: Noch keine Rechnung gestellt." — Konsole fehlerfrei.

**E8 ✔ — Dashboard & Navigation neu gewichten** (keine Migration, erledigt 2026-07-25)
- `nav.ts`-Reihenfolge (Anmietung im Kaufmännisch-Block, Inventar unter Ablage) und
  Geräte-Karten unten am Dashboard (Rest-Inventar-Zeile) waren **bereits aus den
  U-Etappen erledigt** — nur die zwei fehlenden Teile ergänzt:
- Neue KPI-Kachel „Offene Anmietungen" (Anzahl `entwurf`/`angefragt`-Vorgänge + EK-
  Summe offen), nur für `hasArea('anmietung')` — Grid wächst dafür von 4 auf 5
  Kacheln (Desktop), bleibt 2-spaltig mobil.
- Neue Karte „Anmietungen mit Handlungsbedarf" (Seitenspalte, Muster „Fällige
  Aufgaben") — Vorgänge, die noch nicht bestätigt sind, verlinkt zum jeweiligen Job.
- Beweis: Browser mit echten Live-Daten (1 offener Anmiet-Vorgang „Beuchel", 2.000 €
  EK) bei Desktop und 375px, Konsole fehlerfrei. Die animierte Zähl-Kachel (CountUp)
  zeigte in der Browser-Automatisierung „0" statt „1" — Ursache identifiziert:
  `document.hidden === true` im Automatisierungs-Tab pausiert `requestAnimationFrame`;
  Ampel-Farbe und EK-Summe (dieselbe Datengrundlage, nicht animiert) waren korrekt.
  Kein echter Bug, sondern ein Artefakt der Testumgebung — bei einem sichtbaren Tab
  läuft die Animation normal (bestehende, unveränderte CountUp-Komponente).

**E2b-Erweiterung 🔧 — Kategorie an Anmiet-Positionen + KI-Kategorie-Erkennung**
(gebaut 2026-07-25, Migration 0046 `subrental_items.category_id`)
- Tills Bauchgefühl: ein Verleiher-Technikangebot soll sich in der Software genauso
  nach Kategorien sortieren wie die eigene Packliste (Boxen/Licht/Kabel/…). Nach
  Rückfrage geklärt: die **Position** bleibt eine reine Freitext-Zeile am Vorgang
  (kein neues Gerät im Inventar, exakt Rentmans „Temporary Equipment Item"-Muster),
  aber die **Kategorie** verweist auf dieselbe `categories`-Tabelle wie das Inventar —
  gibt's sie noch nicht, wird sie neu angelegt statt die Position kategorielos zu
  lassen.
- `subrental_items.category_id` (nullable FK, `on delete set null`) + Index. Edge
  Function `extract-subrental-document` liefert jetzt zusätzlich
  `items[].category_name_guess`, nachdem sie Tills vorhandene Kategorienamen aus der
  DB geladen und in den Prompt eingebettet hat (KI wählt nur daraus, erfindet keine
  neuen Namen selbst).
- `CreateSubrentalDialog.tsx`: Kategorie-Auswahl je Position, Vorbefüllung aus dem
  Katalog-Gerät (`device.category_id`), Positionsliste jetzt nach Kategorie gruppiert
  dargestellt (`groupSubrentalItemsByCategory` in `lib/subrentals.ts`, Muster
  `groupByLocation` aus `PacklistSection.tsx`). KI-Vorschlag wird gegen vorhandene
  Kategorien abgeglichen (Muster Lieferanten-Fuzzy-Match); kein Treffer → automatisch
  neu angelegt (`useCreateCategory`, bereits vorhandener Hook aus der
  Kategorien-Verwaltung) — sequenziell verarbeitet, damit mehrere Positionen mit
  demselben neuen Namen sich nicht gegenseitig als Dublette anlegen. Schlägt das
  Anlegen mangels Bereich `inventar` fehl (reine `anmietung`-Rechte reichen dafür
  nicht), bleibt die Position kategorielos mit Hinweistext statt Fehlerabbruch.
- Automatische Ablage des hochgeladenen Verleiher-PDFs im Dokumente-Tab war **bereits
  vorhanden** (seit E2b/D-Block, `entity_type: "subrental"`) — keine neue Arbeit.
- Beweis: Prüfkette grün (tsc/lint/**134 Tests**/build, 3 neue Tests für
  `groupSubrentalItemsByCategory`). DB: Migration per `migrations-pruefer`-Subagent
  geprüft (BEREIT), Spalte/FK/Index verifiziert, Transaktions-Testaufbau mit echten
  Kategorien/Lieferant nach dem exakten `useSubrentals.ts`-Join-Muster bestätigt
  Kategorie-Zuordnung + `null` bei kategorielosen Positionen — per `rollback`
  spurlos entfernt. **Kein Browser-Klick-Beweis in dieser Session** (kein
  Preview-/Browser-Werkzeug verfügbar) — die eigentliche KI-Extraktion mit Kategorie
  ist zudem weiterhin an Tills Deploy-Freigabe der Function gebunden (unverändert
  zu E2b).
- **Nachtrag (2026-07-25, echter Test übers Handy):** Till hat die KI-Erkennung
  lokal über Tailscale vom Handy aus ausprobiert (PDF/Foto hochladen im Anmiet-
  Dialog) — die Seite lud neu, „es passierte nichts". Docker-Logs des
  `supabase_edge_runtime`-Containers zeigten den Grund: die Anfrage an
  `extract-subrental-document` hing über 3 Minuten, bis die Runtime sie zwangs-
  weise beendete („early termination"/„wall clock duration warning") — vermutlich
  eine sehr lange/hängende Gemini-Antwort (vermutlich Handy-Foto statt PDF, dazu
  Mobilverbindung über Tailscale). Ohne Rückmeldung lud Till die Seite selbst neu,
  was den Dialog samt Auswahl verwarf. **Behoben:** `useExtractSubrentalDocument.ts`
  bricht die Wartezeit jetzt clientseitig nach 25 Sekunden mit einer klaren
  Fehlermeldung ab (`supabase-js` v2 hat kein `signal`-Option auf
  `functions.invoke`, daher reiner `Promise.race`-Timeout — die Server-Anfrage
  läuft im Hintergrund weiter, aber die Oberfläche hängt nicht mehr endlos).
  Prüfkette grün (138 Tests, keine neue Migration). Ändert nichts an der
  eigentlichen Erkennungsgeschwindigkeit/-qualität — die bleibt wie zuvor
  zurückgestellt, bis Till die Function bewusst freigibt.

**E10 🔧 — Eigentümer-Feld am Gerät (Fremdeigentum wie Schule/Privatperson)**
(gebaut 2026-07-25, Migration 0047 `devices.owner_type`/`owner_name`/
`counts_toward_value`)
- Tills zweite Idee zum selben Bauchgefühl: manche Geräte im System gehören nicht
  der Firma, sondern werden trotzdem im Bestand geführt — komplettes Schul-Inventar
  oder eine privat geliehene Nebelmaschine (Till: „Anton"). Recherchiert (Rentmans
  „Belongs to"-Feld, Panatracks Trennung „wem gehört's" vs. „wo liegt's") und mit
  Till geklärt: feste Auswahl + Name, standardmäßig nur Kennzeichnung, aber pro
  Gerät optional in einen künftigen Inventarwert einrechenbar.
- `devices.owner_type` (`text check` auf `firma`/`schule`/`privat`, Default
  `firma`), `owner_name` (nullable, kein Constraint), `counts_toward_value`
  (boolean, DB-Default `true` — dass Fremdeigentum standardmäßig NICHT mitzählt,
  steuert das Frontend beim Anlegen, keine DB-Konditionallogik). **Kein**
  aggregierter Inventarwert-Bericht existiert heute — das Feld ist rein
  zukunftsgerichtet, bewusst kein neuer Bericht in dieser Etappe.
- `types/database.ts`: `OwnerType`, `OWNER_TYPE_OPTIONS`, reine Funktion
  `describeOwner()` (+ 4 Tests). `useDevices.ts`: `CreateDeviceInput` erweitert
  (`useUpdateDevice` war bereits generisch, keine Änderung nötig).
  `CreateDeviceDialog.tsx`/`DeviceEditCard.tsx`: Eigentümer-`PillSelect` nach
  Kategorie/Lagerort, bedingtes Namensfeld + „Trotzdem in den Inventarwert
  einrechnen"-Checkbox (nur bei Fremdeigentum sichtbar, Wechsel weg von „firma"
  schlägt automatisch „nicht einrechnen" vor). Neue `OwnerBadge` in
  `StatusBadge.tsx` (Muster `StammkundeBadge`, rendert nichts bei „firma").
  `InventoryPage.tsx`: Eigentümer-Filter (Muster Status-/Kategorie-Filter), Badge
  in der Listenzeile, zwei neue CSV-Spalten. `DeviceDetailPage.tsx`: Badge neben
  dem Titel, zwei `DataField`-Einträge in den Stammdaten.
- **Bewusst außerhalb dieser Etappe:** CSV-**Import** (`ImportDevicesDialog.tsx`)
  bekommt keine Eigentümer-Spalten — neue Geräte landen beim Import mit Default
  `firma`, kann später ergänzt werden. Kein neuer Inventarwert-Bericht (s.o.).
- Beweis: Prüfkette grün (tsc/lint/**138 Tests**/build, 4 neue Tests für
  `describeOwner`). DB: Migration vom `migrations-pruefer`-Subagent geprüft
  (BEREIT — dabei eine vorbestehende, unabhängige Lücke gefunden: `devices`/
  `customers` haben aus der Zeit vor der 0012-Konvention keinen `service_role`-
  Grant, für 0047 selbst irrelevant, als eigene Nachbesserung in IDEAS.md
  vorgemerkt). Testaufbau per Transaktion: ungültiger `owner_type` wird vom
  Check-Constraint abgelehnt, Default `firma`/`true` ohne Angabe, explizite
  Schule-/Privat-Zeilen mit `counts_toward_value=false` funktionieren wie
  geplant — per `rollback` spurlos entfernt. **Kein Browser-Klick-Beweis in
  dieser Session** (kein Preview-/Browser-Werkzeug verfügbar).

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
- **2026-07-24:** **E1 abgeschlossen** — Bereich `anmietung` (Migration 0040) +
  Verleih-Partner-Stamm `suppliers` (Migration 0041) live & bewiesen (RLS-Rechteprobe
  mit echtem Nicht-Bereichs-Nutzer, Browser-Beweis Anlegen/Bearbeiten/Löschen +
  Guard-Probe). **E2 direkt im Anschluss abgeschlossen** — Anmiet-Vorgänge am Job
  (Migration 0042 `subrentals`/`subrental_items`), Karte am Job + Tab „Anmietungen"
  auf der Anmietung-Seite, voll bewiesen (RLS, Browser: Anlegen/Status-Wechsel/
  Löschen). Nächster Schritt: **E3** (Verfügbarkeits-Zugänge — Anmietung erhöht die
  Verfügbarkeit im Zeitraum).
- **2026-07-24 (später):** Till äußert Unbehagen am manuellen Abtippen von Verleiher-
  Angeboten/-Rechnungen für Anmiet-Vorgänge. Nach Skill `grosses-feature`: Optionen
  geklärt (beide Dokument-Typen, möglichst vollautomatische Befüllung mit kurzer
  Prüfung), recherchiert (Rentman/Current RMS lösen das nicht automatisch — kein
  Vorbild; allgemeine Beleg-Erkennungstechnik via Vision-KI als Ansatz), Anbieter
  entschieden (Google Gemini kostenlose Stufe statt bezahlter Anthropic-API, auf Tills
  Wunsch nach einer kostenlosen Lösung — NVIDIA NIM geprüft und verworfen, Gemini hat
  natives PDF-Verständnis + großzügigeres Free-Kontingent), Ablauf entschieden (Upload
  sowohl beim Neu-Anlegen als auch nachträglich). **E2b gebaut & lokal bewiesen**:
  Migration 0043 (`documents` um supplier/subrental erweitert), Edge Function
  `extract-subrental-document` (ruhig by default ohne Secret), Upload+Prefill+
  Archivierung in `CreateSubrentalDialog.tsx`. **Die Function ist bewusst NICHT
  deployt** — der reale Extraktions-Test mit Tills Gemini-Key und das Scharfschalten
  stehen noch aus (nach-außen-Wirkendes, braucht ausdrückliche Freigabe).
- **2026-07-25:** **E3 abgeschlossen** — Verfügbarkeits-Zugänge: bestätigte/übernommene/
  zurückgegebene Anmietungen erhöhen jetzt die freie Kapazität im Job-Zeitraum. Neuer
  Knopf „Fehlmenge anmieten" an überbuchten Packlisten-Posten öffnet den Anmiet-Dialog
  vorbefüllt mit Gerät + exakter Fehlmenge. Exakt das im Plan geforderte Szenario im
  Browser durchgespielt (Bestand 12, Bedarf 15 → 3 fehlen → Anmietung bestätigt →
  Warnung weg → zurück auf angefragt → Warnung wieder da). Nächster Schritt: **E4**
  (Bestell-PDF).
- **2026-07-25 (später):** **E2b technisch instand gesetzt, inhaltlich zurückgestellt.**
  Till hat den Gemini-Key gesetzt; erster Echttest lieferte erst `400 API key not
  valid` (Platzhalter noch in `.env`), nach Korrektur `404 model … no longer available
  to new users` (`gemini-2.5-flash` für neue Keys gesperrt) — behoben durch Wechsel auf
  den Alias `gemini-flash-latest`. Danach technisch fehlerfrei, aber Till bewertet die
  inhaltliche Erkennungsqualität als unzureichend („eine Katastrophe") — Prompt/Logik
  brauchen Nacharbeit, **bewusst zurückgestellt**, kein Deploy. **E4 abgeschlossen**
  (keine Migration): `lib/subrentalOrderPdf.tsx` +
  `components/documents/SubrentalOrderPdfDocument.tsx` (Muster `offerPdf.tsx`/
  `OfferPdfDocument`), AM-Nummer client-seitig nach dem AN-Muster
  (`useAssignSubrentalOrderNumber` in `useSubrentals.ts`, partieller Unique-Index als
  Netz, idempotent — vorhandene Nummer wird nicht neu vergeben). Button „Bestell-PDF
  erzeugen" an der Anmiet-Vorgangs-Karte im Job (Tab „Material"). Beweis: echter
  Anmiet-Vorgang im Browser, erste Erzeugung vergibt AM-2026-0001, zweite Erzeugung
  ändert nichts (per psql geprüft — weiterhin genau eine Zeile mit dieser Nummer).
  Auto-Archivierung des PDFs am Vorgang (im Plan als „optional" markiert) **nicht**
  gebaut — hätte eine neue `documents`-Kategorie + Migration gebraucht, aus Aufwands-
  gründen zurückgestellt.
- **2026-07-25 (noch später):** **E5 gebaut & lokal bewiesen** — Bestell-Mail an
  Verleiher: Migration 0044 (`subrental_order_emails`, reines Server-Protokoll wie
  `invoice_dunnings`), Edge Function `send-subrental-order` (Muster `send-dunning`,
  Preview-Pflicht, Resend nur mit `RESEND_API_KEY`, Statuswechsel `entwurf` →
  `angefragt` nur beim ersten Anschreiben). Voraussetzung: Bestellnummer muss bereits
  vergeben sein (E4 zuerst) — die Function verweist sonst auf „erst PDF erzeugen"
  statt selbst eine Nummer zu vergeben. Neuer Dialog `SendSubrentalOrderDialog.tsx`,
  Knopf „Bestell-Mail senden" an der Anmiet-Vorgangs-Karte (nur sichtbar mit
  Bestellnummer). Beweis im Browser: Fehlerpfad ohne Partner-E-Mail (klare Meldung),
  testweise Partner-E-Mail ergänzt → Vorschau korrekt (Positionen, Zeitraum,
  Bestellnummer) → Versand ohne `RESEND_API_KEY` scheitert klar (500, „ruhig by
  default"), psql bestätigt: kein Protokoll-Eintrag, Status unverändert. Testdaten
  (Partner-E-Mail) danach entfernt. **Die Function ist bewusst NICHT deployt** —
  braucht Tills Freigabe (nach-außen-wirkend); der vorhandene `RESEND_API_KEY`
  (Mahnwesen/Leads) reicht, kein neuer Key nötig.
- **2026-07-25 (letzter Schritt):** **E6 abgeschlossen** — Kosten am Job: Migration
  0045 (`job_costs`, EINE generische Tabelle für personal/transport/fremdleistung/
  sonstiges, RLS bewusst auf Bereich `anmietung` statt `jobs` — Kosten/Margen sind wie
  Einkaufspreise sensible kaufmännische Daten). Neue Karte `JobCostsCard.tsx` im
  Job-Tab „Geld": read-only-Zeile „Anmietungen aus Vorgängen" (Summe aktiver
  Anmiet-Vorgänge), Kostenpositionen mit Typ-Badge, Stunden×Satz-Rechner (Betrag wird
  automatisch berechnet, sobald beide Werte gesetzt sind, sonst frei editierbar für
  Pauschalkosten), Knopf „Zugewiesene übernehmen" (legt je zugewiesenem Nutzer ohne
  bestehende Personal-Zeile eine leere Zeile an — Admin-Profile bewusst ausgeschlossen,
  wie bei der Job-Zuweisung selbst). Beweis im Browser: Rechner (8 Std. × 25 € →
  200 €), Summenbildung (Anmietung 2.000 € + Personal 200 € = 2.200 €),
  Zugewiesene-übernehmen (2 Zeilen für 2 zugewiesene Nutzer), Löschen (Knopf taucht
  danach wieder auf), alles per psql gegengeprüft, Testdaten restlos entfernt.
  Rechte-Probe als Logik-Check (kein Live-Login als anderer Nutzer): realer Nutzer
  ohne Bereich `anmietung`/ohne Admin-Rolle → `has_area('anmietung')` liefert `false`.
- **2026-07-25 (letzter Schritt, Teil 2):** **E7 Job-Kalkulation abgeschlossen**
  (keine Migration) — `lib/jobCosting.ts`: `computeJobCosting()` liefert Kalkuliert
  (angenommene Angebote) vs. Abgerechnet (gestellte, nicht stornierte Rechnungen),
  Kosten aus Anmiet-Vorgängen + `job_costs` (E6), Deckungsbeitrag + Marge-%. Neue
  Karte `JobCostingCard.tsx` in der Seitenspalte der Job-Detailseite (immer sichtbar,
  nicht ans „Geld"-Tab gebunden), Marge-Ampel über das bereits vorhandene, bis dahin
  ungenutzte `marginLevel`/`levelTone` aus `statusTone.ts`. `isIssued` aus
  `lib/reports.ts` exportiert statt dupliziert. Beweis: exaktes Plan-Szenario
  (1.000 − 300 − 200 → 500, 50 %) als 3 Vitest-Tests nachgebildet (inkl. Storno-Fall),
  Browser-Beweis mit echten Live-Daten am Job „KEssi" (Erlös 0 €, Anmietung −2.000 €,
  Badge „—" statt Division durch 0, „Noch keine Rechnung gestellt."), Konsole
  fehlerfrei. **Der ReportsPage-Teil (Deckungsbeitrag-Auswertung, „Top-Jobs nach DB")
  ist noch offen** — bewusst als eigener Nachfolge-Schritt zurückgestellt (größere
  Aggregation über alle Jobs, nicht in denselben Commit gequetscht).
- **2026-07-25 (letzter Schritt, Teil 3):** **E8 abgeschlossen** — Dashboard &
  Navigation (keine Migration). Die Nav-Reihenfolge und die Geräte-Karten-Abwertung
  waren aus den U-Etappen bereits erledigt; ergänzt wurden die zwei fehlenden Teile:
  KPI-Kachel „Offene Anmietungen" (Anzahl `entwurf`/`angefragt`-Vorgänge + EK-Summe,
  nur bei `hasArea('anmietung')`, Grid wächst von 4 auf 5 Kacheln) und Karte
  „Anmietungen mit Handlungsbedarf" (Seitenspalte, Muster „Fällige Aufgaben",
  verlinkt zum Job). Beweis mit echten Live-Daten (1 offener Vorgang, 2.000 € EK) bei
  Desktop + 375px, Konsole fehlerfrei. Damit war Block B (E1–E8) im Kern komplett bis
  auf drei zurückgestellte Teile.
- **2026-07-25 (Nachtrag, Runde 2):** Till entscheidet: **E5 (Bestell-Mail) bleibt
  deaktiviert**, bis er es bewusst freigibt — der Knopf „Bestell-Mail senden" ist
  jetzt per Konstante ausgeblendet (`SUBRENTAL_ORDER_MAIL_ENABLED = false` in
  `JobSubrentalsCard.tsx`), Grund/Details s. E5-Abschnitt oben. **E7-ReportsPage-Teil
  nachgeholt** (Till: „geht das nicht in den bestehenden Auswertungs-Tab?" — ja,
  passt als zwei zusätzliche Karten rein statt eigener Seite): `jobMargins()`/
  `topJobsByMargin()`/`marginByMonth()` in `lib/reports.ts` (6 neue Tests), Karten
  „Deckungsbeitrag je Monat" + „Top-Jobs nach Deckungsbeitrag" auf der
  Auswertungen-Seite. Browser-Beweis mit echten Live-Daten (Job „KEssi" mit
  −2.000 € DB durch die Anmietung), ein zunächst zu breiter Filter („Geburtstag" mit
  nur einem nicht angenommenen Angebot rutschte mit 0 € in die Liste) direkt
  nachgeschärft (nur angenommene Angebote/gestellte Rechnungen/Anmietungen/Kosten
  zählen als „hat Grundlage"). **Damit ist Block B (E1–E8) im Kern komplett** — offen
  bleiben nur E2b-Prompt-Qualität und die bewusste E5-Deaktivierung (bis Freigabe).
  Nächster Schritt: **E2b** (Prompt-Qualität der KI-Extraktion verbessern).
- **2026-07-25 (Neuvorhaben angestoßen):** Till bringt zwei neue Ideen ein: Anmiet-
  Positionen sollen sich wie im Inventar nach Kategorien sortieren lassen (Vorbild
  Rentmans „Temporary Equipment Item"), und Geräte im eigenen Bestand sollen einen
  Eigentümer bekommen können (Schule, Privatperson wie „Anton"), falls sie nicht der
  Firma gehören. Nach Skill `grosses-feature`: recherchiert (Rentman/Current
  RMS/Panatrack — kein Tool importiert Lieferanten-Angebote automatisch in die
  eigene Kategorie-Struktur, aber alle führen jede Position mit Kategorie; Rentmans
  „Belongs to"-Feld als Vorbild für Fremdeigentum), mit Till drei Weichenstellungen
  geklärt (KI soll Kategorie raten statt nur manuell; Eigentümer standardmäßig nur
  Kennzeichnung, optional in den Inventarwert einrechenbar; feste Auswahl + Name),
  danach zwei Rückfragen zur Kategorie-Kopplung geklärt (Position bleibt temporär/
  kein neues Gerät, Kategorie aber schon in der echten `categories`-Tabelle, bei
  Bedarf neu angelegt). Plan-Dokument mit zwei Etappen (E2b-Erweiterung, E10)
  erarbeitet und freigegeben. **E2b-Erweiterung direkt umgesetzt** (s. o.).
  Nächster Schritt: **E10** (Eigentümer-Feld am Gerät).
- **2026-07-25 (im Anschluss):** **E10 abgeschlossen** — Eigentümer-Feld am Gerät
  (Migration 0047 `devices.owner_type`/`owner_name`/`counts_toward_value`).
  `describeOwner()` + `OWNER_TYPE_OPTIONS` in `types/database.ts`, Eigentümer-
  Auswahl in beiden Geräte-Dialogen, neue `OwnerBadge` (Muster `StammkundeBadge`),
  Filter + Badge + CSV-Spalten in `InventoryPage.tsx`, Stammdaten-Felder in
  `DeviceDetailPage.tsx`. Beweis: Prüfkette grün (138 Tests, 4 neu), Migration vom
  `migrations-pruefer`-Subagent geprüft (dabei eine vorbestehende, unabhängige
  Lücke gefunden: `devices`/`customers` fehlt der `service_role`-Grant aus der
  0012-Konvention — für 0047 irrelevant, in IDEAS.md als eigene Nachbesserung
  vorgemerkt), DB-Testaufbau per Transaktion bestätigt Constraint + Defaults +
  explizite Fremdeigentum-Zeilen (spurlos zurückgerollt). **Kein Browser-Beweis in
  dieser Session** (kein Preview-Werkzeug verfügbar) — wie schon bei der
  E2b-Erweiterung im selben Arbeitsblock. Damit sind beide am 2026-07-25
  angestoßenen Ideen umgesetzt.
