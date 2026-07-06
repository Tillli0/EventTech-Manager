# EventTech-Manager — Projektleitfaden für Claude

## Die Vision (warum es dieses Projekt gibt)

EventTech-Manager ist das **Betriebssystem für Tills Eventtechnik-Verleih**. Der rote
Faden ist der reale Arbeitsablauf: **Anfrage → Angebot → Job (Packliste, Personal,
Zeitplan) → Rechnung → Zahlung**. Jede Funktion muss sich an diesem Faden messen lassen.

Der Qualitätsanspruch ist „**wie professionelle Branchen-Software**" (Rentman/lexoffice
als Messlatte): Listen sind nie nackte Aufzählungen, sondern haben Kennzahlen-Kopf,
Status-Tabs, Jahres-Archiv, Gruppierung mit Zwischensummen und verknüpfte Vorgänge.
Dokumente (Angebot/Rechnung) hängen sichtbar an Job und Kunde — nie auf einer Insel.

Drei Leitprinzipien prägen jede Entscheidung:

1. **Backend ist die Wahrheit.** Rechte, Invarianten und Schutzregeln werden in Postgres
   erzwungen (RLS, Constraints, Trigger, Advisory Locks). Die UI blendet nur aus Komfort
   aus. Sicherheit oder Korrektheit, die nur im Frontend lebt, gilt als nicht vorhanden.
2. **Volle Kontrolle über die eigenen Daten.** Lokaler Docker-Stack für Entwicklung,
   eigene Supabase-Cloud für Produktion, Backups in Nutzerhand.
3. **Beweisen statt behaupten.** Fertig ist ein Feature erst nach dem Verifikations-Ritual
   (unten) inklusive echtem Browser-/DB-Beweis.

## Wo welches Wissen liegt (Doku-Landkarte)

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` (diese Datei) | Arbeitsregeln, Architektur-Kompass, Rituale |
| `apps/web/CLAUDE.md` | Frontend-Konventionen: Design-System, Listen-Rezept, Hook-Muster |
| `IDEAS.md` | Ideen-Backlog + Verlauf „Kürzlich umgesetzt" (nach jeder Aufgabe pflegen!) |
| `PLAN-FABLE5.md`, `PLAN-*.md` | Plan-Dokumente für große Vorhaben (Stand + offene Blöcke) |
| `DEPLOY.md` | Produktions-Setup (Cloudflare Pages + Supabase Cloud), Runbook |
| `.claude/skills/` | Runbooks/Rezepte: Dev-Umgebung, Feature-Abschluss, Migrationen, große Features |

**Bei jeder neuen Session:** erst `IDEAS.md` (Stand) und ggf. das aktive `PLAN-*.md` lesen.

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
