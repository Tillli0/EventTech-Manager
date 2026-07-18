# EventTech-Manager — Projektleitfaden für Claude

## Die Vision (warum es dieses Projekt gibt)

EventTech-Manager ist das **Betriebssystem für Tills Event-Dienstleistung**. Till
**plant und setzt Veranstaltungen um**; die Technik dafür wird überwiegend bei
Partner-Verleihern **angemietet** (kleines eigenes Rest-Inventar). Der rote Faden ist
der reale Arbeitsablauf: **Anfrage → Angebot → Job (Material eigen + angemietet ·
Personal · Fremdgewerke · Dokumente) → Bestellungen an Verleiher → Rechnung → Zahlung →
Nachkalkulation**. Jede Funktion muss sich an diesem Faden messen lassen.

> **Geschäftsmodell-Wende (2026-07-17):** vom Technik-**Verleih** (eigener Bestand wird
> vermietet) zum **Event-Dienstleister** (planen + umsetzen, Technik anmieten). Das
> bestehende Fundament bleibt wertvoll; neu sind **Dokumenten-Ablage**, **Anmietung**
> (Verleih-Partner + Anmiet-Vorgänge) und **Kalkulation** (Deckungsbeitrag je Job).
> Steuerung: `PLAN-NEUAUSRICHTUNG.md` (Etappen) und `ROADMAP.md` (Phasen 1–2).

Der Qualitätsanspruch ist „**wie professionelle Branchen-Software**": Rentman/Current RMS
(Verleih-Workflow inkl. **Subrental/Purchase-Order**), lexoffice/sevDesk (Rechnungswesen/
GoBD, **Dokumenten-Ablage**). Listen sind nie nackte Aufzählungen, sondern haben
Kennzahlen-Kopf, Status-Tabs, Jahres-Archiv, Gruppierung mit Zwischensummen und
verknüpfte Vorgänge. Dokumente (Angebot/Rechnung, Genehmigungen, Verleiher-Rechnungen)
hängen sichtbar an Job und Kunde — nie auf einer Insel.

Drei Leitprinzipien prägen jede Entscheidung:

1. **Backend ist die Wahrheit.** Rechte, Invarianten und Schutzregeln werden in Postgres
   erzwungen (RLS, Constraints, Trigger, Advisory Locks). Die UI blendet nur aus Komfort
   aus. Sicherheit oder Korrektheit, die nur im Frontend lebt, gilt als nicht vorhanden.
2. **Volle Kontrolle über die eigenen Daten.** Lokaler Docker-Stack für Entwicklung,
   eigene Supabase-Cloud für Produktion, Backups in Nutzerhand.
3. **Beweisen statt behaupten.** Fertig ist ein Feature erst nach dem Verifikations-Ritual
   (unten) inklusive echtem Browser-/DB-Beweis.

## Wo welches Wissen liegt (Doku-Landkarte)

| Datei | Inhalt | Wird aktualisiert bei … |
|---|---|---|
| `CLAUDE.md` (diese Datei) | Arbeitsregeln, Architektur-Kompass, Rituale | neuer/geänderter Grundregel |
| `apps/web/CLAUDE.md` | Frontend-Konventionen: Design-System, Listen-Rezept, Hook-Muster | neuer Frontend-Konvention |
| `ARBEITSWEISE.md` | Wie Till & Claude zusammenarbeiten: Aufgabengrößen, Skill-Wahl, Modellwahl | geänderter Zusammenarbeits-Regel |
| `ROADMAP.md` | Nordstern: Langzeit-Ziel, Phasen, „woran erkennen wir Fertig" | erreichtem Meilenstein/Phasenwechsel |
| `IDEAS.md` | Ideen-Backlog + Verlauf „Kürzlich umgesetzt" | **jeder** abgeschlossenen Aufgabe (Pflicht) |
| `PLAN-V1-ABSICHERN.md` | **🔴 AKTIV (seit 2026-07-18)**: v1 beweisbar sicher machen (Restore-Probe, Storage-Backup, E2E-Netz) — inkl. **geprüftem Ist-Zustand mit Belegen** | jeder Etappe A1–A4 |
| `PLAN-UI-NEUSCHNITT.md` | **Wartet auf A3**: helles Theme (umschaltbar), Navigation, Startseite „Nächster Einsatz", Dokumente als Job-Ordner | jeder Etappe U1–U6 |
| `PLAN-NEUAUSRICHTUNG.md` | Verleih → Event-Dienstleister; Block A (Dokumente) **fertig**, Block B (Anmietung/Kalkulation) offen — **läuft nach den U-Etappen** | jeder Etappe des Vorhabens |
| `PLAN-MEIN-PLAN.md` | Die persönliche Säule (Schule/Minijob/Verfügbarkeit); **M1 wird in U4 vorgezogen**, M2 geht in U4 auf | jeder Etappe M1–M6 |
| `docs/UI-REVIEW-2026-07-18.md` | Bestandsaufnahme der UI-Wiederholungsmuster (Grundlage des Neuschnitts) | nie (Momentaufnahme) |
| `docs/mockups/` | Visuelle Vorlagen: drei Farbwelten + Dashboard-Neuschnitt | neuem Mockup |
| `DEPLOY.md` | Produktions-Setup (Cloudflare Pages + Supabase Cloud), Runbook, **Backup & Restore** | Deploy-/Infra-Änderung |
| `WORKFLOW.md` | Technischer Alltag lokal → live | Änderung am Entwicklungs-Ablauf |
| `.claude/skills/` | Runbooks/Rezepte: Dev-Umgebung, Feature-Abschluss, Migrationen, große Features | neuem/geändertem Rezept |
| `docs/archiv/` | Erledigte/überholte Pläne — nur noch Referenz, wird **nicht** mehr gepflegt | nie (Ablage-Ordner) |

**Bei jeder neuen Session zuerst lesen** (Reihenfolge nach Bedarf, nicht alles auf Vorrat):
`IDEAS.md` (was steht an) → **`PLAN-V1-ABSICHERN.md` (das aktive Vorhaben)** → weiteres
`PLAN-*.md` nur, wenn dort weitergearbeitet wird → `ROADMAP.md` nur, wenn die große
Richtung unklar ist. `ARBEITSWEISE.md` und `apps/web/CLAUDE.md` situativ (Skill-Wahl bzw.
Frontend-Arbeit).

**Die aktuelle Reihenfolge der Großvorhaben** (Stand 2026-07-18) — nicht eigenmächtig
umstellen:
`PLAN-V1-ABSICHERN.md` (A1–A4) → `PLAN-UI-NEUSCHNITT.md` (U1–U6, zieht M1 mit)
→ `PLAN-NEUAUSRICHTUNG.md` Block B (E1–E7) → `PLAN-MEIN-PLAN.md` (M3–M6).
Begründung: Erst das Sicherheitsnetz, dann die Struktur, dann die Features, die in diese
Struktur einziehen.

**Faustregel fürs Pflegen:** jede erledigte Aufgabe braucht **mindestens** einen Eintrag in
`IDEAS.md`. Nur bei aktiven Großvorhaben zusätzlich das passende `PLAN-*.md`. Ist ein
Plan komplett umgesetzt, oben im Dokument mit Stand+Datum als „UMGESETZT" markieren und
nach `docs/archiv/` verschieben (git mv, Historie bleibt erhalten).

## Arbeitsweise: Commit & Push nach jeder fertigen Aufgabe

**Verbindlich:** Sobald eine Teilaufgabe fertig **und verifiziert** ist, wird sie direkt
auf `main` committet und gepusht. Nicht sammeln. Nie roten Stand pushen.

```bash
git add -A && git commit -m "<was + warum, deutsch>" && git push
```

- Commit-Trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.
- CRLF-Warnungen beim Commit sind auf diesem Windows-Setup normal — ignorieren.
- Feature-Branches nur für riskante/nach-außen-wirkende Bündel; sonst direkt `main`.

## Weiterentwicklungs-Modus: Standard — „+" schaltet ihn AUS

**Nachricht OHNE führendes `+`:** proaktiv weiterentwickeln.
1. Konkrete Aufgabe der Nachricht zuerst erledigen.
2. Kleine, risikoarme Verbesserungen eigenständig umsetzen + committen (reines Frontend
   ohne Schema-Änderung, UI-Politur, Texte, offensichtliche Fixes, ESLint-Aufräumen).
   **Nicht eigenständig:** Migrationen/neue Tabellen, Edge Functions, Auth/RLS,
   Datenmigrationen, bereichsübergreifende Refactors, alles nach-außen-Wirkende
   (Function-Deploys, Secrets, Mails) — solche Features **vorschlagen, nicht ungefragt bauen**.
3. `IDEAS.md` pflegen (Neues ergänzen, Umgesetztes in den Verlauf verschieben).
4. Immer berichten: was wurde umgesetzt & gepusht (mit Commit-Bezug), was steht zur Wahl.

**Nachricht MIT führendem `+`:** NUR die genannte Aufgabe, nichts darüber hinaus.

## Das Verifikations-Ritual (Definition von „fertig")

1. **Prüfkette grün** (alle vier, vor jedem Commit):
   `pnpm --filter @eventtech/web exec tsc --noEmit` · `pnpm lint` · `pnpm test` · `pnpm build`
2. **Browser-Beweis** über die Preview-MCP (Server `web-dev` aus `.claude/launch.json`,
   Login `admin@eventtech.local` / `EventTech2026!`): das neue Verhalten real durchspielen,
   Konsole fehlerfrei, mobil (375px) + Desktop bei Layout-Änderungen.
3. **DB-Beweis** bei Schema-/Logikänderungen: direkt per
   `docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres` testen —
   bei Nummernkreisen/Locks auch den **Parallelfall** (zwei gleichzeitige Aufrufe).
4. **Testdaten aufräumen** (Titel-Präfix `TEST-…` verwenden, danach löschen; Schutz-Trigger
   dafür kurz `disable` und wieder `enable`).
5. Kernlogik (Summen, Status-Ableitungen, Überlappungen, Gruppierungen) als
   **Vitest-Unit-Test** in `src/lib/*.test.ts` bzw. `src/types/database.test.ts`.

Details + typische Fehlerbilder: Skill `feature-fertigstellen`.

## Deploy-Pipeline (was ein Push auf main auslöst)

- **Frontend:** Cloudflare Pages baut automatisch aus GitHub → live.
- **Datenbank:** GitHub-Action `db-migrate` pusht neue Dateien unter `supabase/migrations/`
  automatisch in die Cloud-DB. Nach dem Push die Actions prüfen (öffentliche GitHub-API,
  `gh` ist nicht installiert) und den Erfolg in der Cloud verifizieren
  (`supabase db query --linked`, nur lesend).
- **Edge Functions werden NICHT automatisch deployt** — bewusst manueller Schritt
  (`supabase functions deploy <name>`), bei nach-außen-wirkenden Functions nie ungefragt.
- **Nie** `supabase db push` direkt auf Produktion ohne ausdrückliche Freigabe — die
  Pipeline ist der autorisierte Weg.

## Domänen-Invarianten (in der DB erzwungen — nicht aufweichen)

- **Rechnungen (GoBD):** Entwürfe haben keine Nummer; `issue_invoice()` vergibt sie
  **lückenlos pro Jahr** unter `pg_advisory_xact_lock`. Gestellte Rechnungen sind
  unlöschbar und nummern-fixiert (Trigger) — Korrektur nur per **Storno + neue Rechnung**.
  Status teilbezahlt/überfällig/bezahlt wird **abgeleitet** (Zahlungen + Fälligkeit),
  nie gespeichert. Adress-Snapshot beim Stellen.
- **Verfügbarkeit:** eine Wahrheit in `apps/web/src/lib/availability.ts` — frei = Bestand
  − defekt − fremdgebucht über **zeitraum-überlappende** Jobs in bindenden Status;
  Papierkorb-Jobs (`deleted_at`) binden nie. Neue Verfügbarkeits-Queries müssen beide
  Filter (Status-Liste + `deleted_at is null`) setzen.
- **Mahnwesen:** Versand-Protokoll `invoice_dunnings` schreibt nur der Server
  (service_role); Unique `(invoice_id, level)` verhindert Doppelversand. Ohne
  `RESEND_API_KEY`-Secret geht keine Mail raus — dieses „standardmäßig ruhig"-Muster
  gilt für alle künftigen nach-außen-wirkenden Features.

## Stolpersteine (teuer bezahlt — nicht wiederholen)

- **Neue Tabellen brauchen explizite GRANTs** (`authenticated`, `service_role`) — sonst
  stille leere Daten/403. RLS-Muster aus `0012_auth_roles_and_access.sql` übernehmen.
- **Migrationen** non-destruktiv, fortlaufend nummeriert (`ls supabase/migrations/ | tail`
  für die nächste Nummer), lokal per psql anwenden. Details: Skill `db-migration`.
- **Edge Functions** lokal erst nach `supabase stop && supabase start` aktiv.
- **CI:** pnpm-Version kommt NUR aus `packageManager` in package.json (keine `version:` im
  Workflow); `supabase/setup-cli` auf feste Version pinnen (`latest` ist fehlgeschlagen).
- **Vitest v2.x** behalten (v4 inkompatibel mit Vite 5). ESLint läuft mit
  `--max-warnings 0` — auch ungenutzte eslint-disable-Direktiven sind Fehler.
- **Kein NBSP/Sonderzeichen** blind in Tests tippen — ` ` als Escape schreiben.
- **Verwaiste Dev-Server:** hängt Port 5173, gehört der node-Prozess fast immer einem
  alten Vite — Kommandozeile prüfen (`wmic process where ProcessId=<pid> get CommandLine`),
  dann killen und Preview neu starten.
- Der lokale Stack nutzt Default-JWT-Secrets → **nie das lokale Backend öffentlich
  exponieren**. Service-Role-Key nur serverseitig.

## Befehle

- Dev: `pnpm dev` · Build: `pnpm build` · Lint: `pnpm lint` · Tests: `pnpm test`
- Typecheck: `pnpm --filter @eventtech/web exec tsc --noEmit`
- Lokale DB-Shell: `docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres`
- Cloud lesend prüfen: `supabase db query --linked "<select …>" -o table`
