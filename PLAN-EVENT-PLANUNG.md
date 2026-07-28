# PLAN — Die Planungs-Seite des Jobs

> **Großes Vorhaben, freigegeben.** Stand: **2026-07-28** — Till hat die Umsetzung
> freigegeben; P0 (Probelauf) ist erledigt, siehe §2 für Ergebnis und den wichtigsten Fund
> (Angebot↔Job↔Rechnung-Verknüpfung fehlt in der UI trotz vorhandenem Schema).
> **P4 hat eine echte Abhängigkeit zu M5** (`PLAN-MEIN-PLAN.md`) — siehe dort.
>
> `ROADMAP.md` sagt WOHIN, `CLAUDE.md` WIE, hier stehen die **Details**.

---

## 1. Warum es dieses Vorhaben gibt

Der Auslöser war eine Außensicht auf die laufende Anwendung (2026-07-28, Rolle
„Investor, der selbst in der Branche arbeitet"). Der Befund in einem Satz:

> Das System **verwaltet** eine Veranstaltung sauber — Material, Geld, Dokumente,
> Anmietung, Nachkalkulation. Beim **Planen** lässt es Till allein.

Till ist Selbständiger mit einem Drei-Mann-Team und **plant die Events selbst**. Genau
diese Tätigkeit hat im System bisher keinen Ort. Die Lücken, konkret am Bildschirm
beobachtet:

| Lücke | Was heute da ist | Was fehlt |
|---|---|---|
| **Ort** | `jobs.location` — ein Textfeld („Gemeinde") | Adresse, Ansprechpartner vor Ort, Zufahrt/Parken/Strom — und die Wiederverwendung beim zweiten Mal in derselben Halle |
| **Ablaufplan** | Programmpunkte am Job (`calendar_entries`) | ein Blatt zum Rausgeben für Crew und Kunde |
| **Vorlagen** | jeder Job beginnt leer | „Hochzeit-Standard" belegt Programmpunkte, Aufgaben, Material vor |
| **Crew** | `job_assignees` = nur (Job, Nutzer) | wer wann, in welcher Rolle — und daraus die Personalkosten |
| **Fremdgewerke** | `job_costs.cost_type = 'fremdleistung'` (nur Geld) | Catering/Zelt/Bühne/Security **koordinieren**: angefragt, zugesagt, wann vor Ort |
| **Gesprächsverlauf** | ein Notizfeld `jobs.notes` | datierte Einträge: „12.06. telefoniert — Kunde will Nebelmaschine" |

**Der Maßstab:** Till plant einen kompletten Job, ohne WhatsApp, Zettel oder Excel zu
öffnen.

**Ausdrücklich verworfen (Tills Vorgabe, 2026-07-28):** Dies ist **kein Verkaufsprodukt**.
Kein Mandanten-Modell, keine Selbstregistrierung, **kein Kundenportal** — Kunden tragen
sich nicht selbst ein. Alles bleibt intern für das Drei-Mann-Team.

## 2. Etappe P0 — der Probelauf (kein Code, geht allem voraus)

> **Ergebnis des Probelaufs (2026-07-28).** Hinweis zur Methode: Till hat entschieden,
> den Probelauf mit einem **erfundenen** Testfall (`TEST-Musterfirma GmbH`, Sommerfest,
> Ton/Licht/Bühne, Catering-Fremdgewerk) statt eines echten Jobs durchzuspielen — die
> Liste unten ist dadurch ein **Vorschlag**, kein belastbarer Befund aus echter Praxis
> (siehe Warnhinweis im Chat). Till sollte kurz gegenlesen, ob sie zu seiner Realität passt.
>
> Kompletter Faden gespielt: Kunde → Angebot (AN-2026-0003) → Job (Planung, Material
> eigen `Mischpult` + Anmiet-Vorgang `Beuchel`/Bühne, Personal-Kosten, Fremdleistung
> Catering) → Bestell-PDF → Rechnung (RE-2026-0001, gestellt, bezahlt). Testdaten wieder
> entfernt.
>
> **Der größte Fund, mit Abstand:** `offers.job_id` und `invoices.job_id` **existieren
> im Schema** — die Verknüpfung Angebot↔Job↔Rechnung ist technisch längst vorgesehen.
> Aber **keine der drei Anlage-Masken nutzt sie**: der „Job anlegen"-Dialog hat kein
> Feld für ein bestehendes Angebot, das Angebot hat kein Feld für einen bestehenden Job,
> und „Zu Rechnung machen" vom Angebot vererbt zwar `offer_id`, aber nie `job_id`. Ergebnis
> im Test: Rechnung RE-2026-0001 wurde gestellt und bezahlt (505,75 €) — der zugehörige
> Job zeigt trotzdem weiterhin **„Erlös 0,00 €" und „Noch keine Rechnung gestellt"**.
> Genau das widerspricht §7 („Nachkalkulation zeigt einen Deckungsbeitrag, der Personal
> und Fremdgewerke wirklich enthält") — ohne Erlös ist die Nachkalkulation bloß eine
> Kostenliste. **Das ist kein P1–P6-Punkt aus diesem Plan, sondern eine Vorbedingung**:
> ohne diese Verknüpfung bleibt „woran wir fertig erkennen" (§7) unerreichbar, egal wie
> viele der Etappen P1–P6 gebaut werden. Empfehlung: vor P1 als eigene kleine Korrektur
> einschieben (UI-Felder + Vererbung beim „Zu Rechnung machen").
>
> **Weitere beobachtete Reibungspunkte** (kleiner, bestätigen aber die Grundthese des Plans):
> - Packliste (eigenes Material) ist erst ab Job-Status „Planung" sichtbar/bearbeitbar —
>   nicht offensichtlich beim ersten Mal.
> - Kostenart „Fremdleistung" landet in der Kalkulation unter der Sammelkategorie
>   „Sonstiges", nicht sichtbar als eigene Fremdgewerke-Zeile (bestätigt E-F/P5-Bedarf).
> - „Zugewiesene übernehmen" (Zuweisung → Personalkosten) legt eine **0,00-€-Zeile** an,
>   weil `job_assignees` noch keine Zeiten/Stundensatz kennt (bestätigt E-D/P4-Bedarf
>   — Stunden mussten manuell nachgetragen werden).
> - Kein direkter „Rechnung erstellen"-Knopf am Job selbst — nur über Angebot oder die
>   separate Rechnungen-Seite, beide ohne Bezug zu den tatsächlichen Job-Kosten.


Im System steht **kein einziger echter Job**; „Wolfgang Baxpehler" und „Hochzeit" sind
Testdaten. Damit ist jede Feature-Liste — auch die oben — **geraten**.

Deshalb zuerst, ohne eine Zeile Code:

1. Eine Veranstaltung, die Till wirklich kennt, **komplett durchspielen**: Anfrage →
   Angebot → Job → Material/Anmietung → Rechnung → Nachkalkulation. In einem Rutsch,
   etwa eine Stunde.
2. An **jeder** Stelle, an der Till zum Handy, zum Zettel oder zu Excel greifen will,
   eine Aufgabe unter „Verbesserungen" anlegen.
3. Danach **Testdaten entfernen** (Präfix `TEST-…`), damit die Auswertungen nicht ab Tag
   eins lügen.

**Diese Liste sticht die Reihenfolge unten.** P1–P6 dürfen nach P0 umsortiert oder
gestrichen werden; was der Probelauf nicht weh tut, wird nicht gebaut.

## 3. Kern-Entscheidungen

### E-A · Ort wird ein eigener Eintrag, `jobs.location` bleibt stehen
Neue Tabelle `venues`, neue Spalte `jobs.venue_id`. **`jobs.location` wird nicht gelöscht**
(Migrationen sind non-destruktiv) und dient als Freitext-Fallback für Altdaten und für
Jobs ohne festen Ort.

> **Regel gegen die Doppelpflege:** Sobald `venue_id` gesetzt ist, zeigt die Oberfläche
> nur noch den Ort-Eintrag. Nie beide Felder gleichzeitig zum Ausfüllen anbieten.

Ein Ort ist **Betriebswissen**, kein persönliches Datum → normales Hausmuster
`has_area('jobs')`, nicht die Sonder-RLS aus `PLAN-MEIN-PLAN.md`.

### E-B · Der Ablaufplan braucht keine neuen Daten
Die Programmpunkte liegen bereits als `calendar_entries` mit `job_id` am Job
(`components/jobs/JobMilestonesSection.tsx`). P2 ist deshalb **reine Ausgabe** — kein
Schema, keine Migration.

Wiederverwendet wird das etablierte PDF-Muster: `components/offers/OfferPdfDocument.tsx`
+ `lib/offerPdf.tsx` (dasselbe Paar existiert für Rechnung und Bestellung). Briefkopf aus
`company_settings` wie beim Angebot.

**Eine Fassung, ein Schalter:** „interne Notizen mitdrucken" (an = Crew-Blatt, aus =
Kunden-Blatt). Keine zwei getrennten Dokumente — das wäre doppelte Pflege.

### E-C · Vorlagen entstehen aus echten Jobs, nicht auf der grünen Wiese
Kein Vorlagen-Editor. Stattdessen **„aus diesem Job eine Vorlage machen"**. Das spart eine
komplette Oberfläche und trifft die Realität: Till weiß nach der dritten Hochzeit, wie
eine Hochzeit läuft — vorher nicht.

Zeiten werden **relativ zum Job-Start** gespeichert (Offset in Minuten), nie absolut.

### E-D · Crew-Zeiten schlagen Kosten vor, sie schreiben sie nicht
`job_costs` (Migration `0045`) kann Personalkosten bereits: `cost_type='personal'`,
`profile_id`, `hours`, `hourly_rate`, `amount`. Die Wahrheit ist `amount`, Stunden × Satz
ist Komfort — dasselbe Muster wie bei den Anmiet-Kosten.

P4 erweitert deshalb nur `job_assignees` um Zeiten und Rolle und **bietet an**, daraus
eine Kostenzeile zu erzeugen. Automatisches Schreiben ist verboten:

> **Doppelzähl-Falle:** Trägt Till die Crew-Zeit ein *und* tippt zusätzlich eine
> Personal-Kostenposition, zählt der Deckungsbeitrag doppelt. Die erzeugte Zeile muss
> erkennbar an die Zuweisung gebunden sein (`job_costs.assignee_ref`), damit sie beim
> zweiten Mal aktualisiert statt hinzugefügt wird.

### E-E · Stundensätze niemals an `profiles`
`profiles` ist für alle `authenticated` lesbar (Migration `0012`). Der Satz kommt aus dem
geplanten Preset in `company_settings` (steht in `IDEAS.md`) — dieselbe Falle beschreiben
`PLAN-MEIN-PLAN.md` E-C und `PLAN-NEUAUSRICHTUNG.md` §7.4 bereits.

### E-F · Fremdgewerke bekommen keinen zweiten Partner-Stamm
`suppliers` (Migration `0041`) ist bereits allgemein gehalten: Name, Ansprechpartner,
E-Mail, Telefon, Adresse, Notizen — **nichts daran ist verleiher-spezifisch**. Catering,
Zelt, Bühne und Security werden dort mitgeführt (unterschieden über ein Gewerk-Feld), die
Job-Verbindung bekommt eine eigene schlanke Tabelle. Ein zweiter Adressstamm wäre genau
die Zersplitterung, die das System bisher vermeidet.

### E-G · Reihenfolge folgt dem Faden, nicht der Lust
Anfrage → Angebot → Job → Bestellung → Rechnung. Immer das früheste Loch zuerst; was
vorne fehlt, fehlt hinten nochmal. Zweite Regel: **erst sammeln, dann auswerten.** Der Ort
lohnt sich ab dem ersten Job — baut man ihn in einem Jahr, fehlt das Wissen aus zwanzig
Veranstaltungen rückwirkend.

## 4. Etappen

Nächste freie Migrationsnummer bei Planerstellung: **`0049`**
(`ls supabase/migrations/ | tail` vor jeder Etappe erneut prüfen).

**P0 — Probelauf** *(kein Code)* — siehe §2. **Muss vor P1 liegen.**

**P1 — Ort als echter Eintrag** *(1 Migration)*
`venues` (Name, Adresse, Ansprechpartner vor Ort, Telefon, plus die Praxisfelder Zufahrt,
Parken, Strom, Besonderheiten) + `jobs.venue_id` (nullable, `on delete set null`).
RLS/GRANT-Schablone aus `0012`, `has_area('jobs')`, `notify pgrst`. Liste nach dem
Listen-Rezept aus `apps/web/CLAUDE.md`; Kunden-Detailseite als Vorbild für die Ortsakte
mit den zugehörigen Jobs.
*Beweis:* zweiter Job an derselben Halle zeigt die Notizen aus Job 1; psql-Gegenprobe,
dass ein gelöschter Ort den Job nicht mitnimmt.

**P2 — Ablaufplan zum Rausgeben** *(keine Migration)*
`RunSheetPdfDocument.tsx` + `lib/runSheetPdf.tsx` nach dem Muster von `offerPdf`.
Zeitlich sortiert, Ort aus P1 im Kopf, Schalter für interne Notizen (E-B).
*Beweis:* PDF im Browser öffnen, Reihenfolge stimmt, Programmpunkt über Mitternacht und
über die Sommerzeit-Umstellung korrekt.

**P3 — Vorlage je Event-Art** *(1 Migration)*
`job_templates` + `job_template_items` (Programmpunkte, Aufgaben, Material — Zeiten als
Offset zum Job-Start, E-C). Knopf „aus diesem Job eine Vorlage machen" und „Vorlage
anwenden" beim Job-Anlegen. **Bewusst nach P1/P2:** eine Vorlage kann nur vorbelegen,
was es an Feldern gibt.
*Beweis:* Vorlage aus einem Job erzeugen, auf einen neuen Job mit anderem Datum anwenden
— alle Zeiten korrekt verschoben; Vitest für die Offset-Rechnung inkl. Zeitumstellung.

**P4 — Crew mit Zeiten und Rollen** *(1 Migration — Abhängigkeit beachten)*
`job_assignees` um `start_at`, `end_at`, `role` erweitern (alle nullable, non-destruktiv).
Kostenvorschlag nach E-D, Satz nach E-E.
> **Abhängigkeit:** `PLAN-MEIN-PLAN.md` **M5** liefert `personal_busy_ranges` und damit
> die Warnung „Max ist am 14.09. nicht verfügbar". P4 **nach** M5 zu bauen bedeutet, dass
> die Warnung genau dann erscheint, wenn Till die Zeit einträgt. Umgekehrt gebaut, muss
> die Zuweisungs-Oberfläche zweimal angefasst werden.
> Außerdem berührt P4 den in `PLAN-MEIN-PLAN.md` §6 als „ferne Zukunft" **geparkten**
> Punkt (wer macht was im Ablauf). Diese Parkposition wird hiermit zur Entscheidung
> gestellt — **Till entscheidet**, sie wird nicht stillschweigend aufgehoben.

*Beweis:* zwei Crew-Zeiten eintragen → Personalkosten-Vorschlag rechnet richtig,
Deckungsbeitrag ändert sich; zweites Anwenden erzeugt **keine** zweite Kostenzeile.

**P5 — Fremdgewerke koordinieren** *(1 Migration)*
Gewerk-Feld an `suppliers` (E-F) + `job_services` (job_id, supplier_id, Gewerk, Status
angefragt/zugesagt/abgesagt, Zeit vor Ort, vereinbarter Preis). Kostenseite weiterhin über
`job_costs.cost_type='fremdleistung'`.
*Beweis:* zugesagtes Gewerk erscheint im Ablaufplan (P2) und wirkt in der Kalkulation.

**P6 — Gesprächsverlauf am Job** *(1 Migration)*
`job_notes` (Datum, Verfasser, Text). `jobs.notes` bleibt als Kopfnotiz bestehen.
**Bewusst zuletzt:** lohnt sich erst, wenn echte Jobs über Monate laufen.
*Beweis:* zwei Einträge, absteigend sortiert, Verfasser stimmt.

## 5. Risiken

1. **Vorratsbau (größtes Risiko).** Ohne echten Job bauen wir gegen eine geratene Liste.
   → P0 ist Pflicht, und P1–P6 sind danach ausdrücklich umsortierbar.
2. **Doppelpflege Ort** (E-A) — Regel: `venue_id` gesetzt ⇒ `location` nur noch Anzeige.
3. **Doppelte Personalkosten** (E-D) — die stärkste Fehlerquelle dieses Plans, weil sie
   still den Deckungsbeitrag verfälscht.
4. **`profiles`-Falle** (E-E) — Stundensätze sind keine allgemein lesbaren Daten.
5. **Vorlagen mit absoluten Zeiten** (E-C) — würden beim zweiten Job falsche Uhrzeiten
   erzeugen.
6. **GRANTs vergessen** → still leere Daten/403. Schablone aus `0012`, vor dem Anwenden
   den `migrations-pruefer`-Subagenten laufen lassen.
7. **Scope-Falle Ort:** kein Raumbuchungs-System, keine Karten-Einbindung, keine
   Anfahrtsberechnung — ein Ort ist eine Akte mit Notizen, sonst wird daraus ein zweites
   Produkt.

## 6. Was bewusst NICHT enthalten ist

- **Kein Kundenportal, keine Selbstregistrierung** (Tills Vorgabe, §1).
- **Keine Erinnerungen/Benachrichtigungen** — eigenes Thema, wirkt nach außen (Mail) und
  gehört unter das „standardmäßig ruhig"-Muster aus `CLAUDE.md`.
- **Keine globale Suche, kein Änderungsprotokoll** — stehen bereits in `IDEAS.md`.
- Keine Schicht- oder Urlaubsplanung für die Crew — das ist `PLAN-MEIN-PLAN.md`.
- Keine Wetter-, Karten- oder Routen-Anbindung.

## 7. Woran wir „fertig" erkennen

Till plant einen echten Job von der Anfrage bis zum Ablaufplan **vollständig im System** —
und die Nachkalkulation zeigt am Ende einen Deckungsbeitrag, der Personal und
Fremdgewerke wirklich enthält.

## 8. Verlauf

- **2026-07-28:** Vorhaben aus einer Außensicht auf die laufende Anwendung entstanden
  (Rollen-Feedback „warum würde ich nicht investieren / es nicht selbst nutzen").
  Tills Korrektur dazu: kein Verkaufsprodukt, kein Kundenportal, drei Leute, er plant
  selbst. Fundament geprüft: `jobs.location` ist Freitext, Programmpunkte liegen bereits
  als `calendar_entries` am Job, `job_costs` kennt `personal` (mit Stunden/Satz) und
  `fremdleistung`, `suppliers` ist ein allgemeiner Partner-Stamm. Daraus P0–P6 und die
  Entscheidungen E-A…E-G. **Noch nicht freigegeben.**
