---
name: feature-fertigstellen
description: >-
  Abschluss-Ritual für JEDE Code-Änderung im EventTech-Manager: verifizieren, beweisen,
  committen, deployen, Deploy überwachen. Nutze diesen Skill IMMER, bevor du eine Aufgabe
  als „fertig" meldest oder committest — und besonders bei: Push auf main, fehlgeschlagenen
  GitHub-Actions, Browser-Verifikation über die Preview-MCP, Anlegen/Aufräumen von
  Testdaten, oder wenn geprüft werden soll, ob eine Migration in der Cloud angekommen ist.
---

# Feature fertigstellen — Verifizieren, Beweisen, Ausliefern

„Fertig" heißt in diesem Projekt: **bewiesen, committet, deployt, Deploy bestätigt.**
Wer einen Schritt auslässt, meldet das ausdrücklich — nie stillschweigend.

## 1) Prüfkette (vor jedem Commit, alle vier)

```bash
pnpm --filter @eventtech/web exec tsc --noEmit
pnpm lint      # --max-warnings 0: auch ungenutzte Importe/Disable-Direktiven = rot
pnpm test      # Vitest; neue Kernlogik braucht eigene Tests in src/lib/*.test.ts
pnpm build
```

Typische Fallen: nach Refactors bleiben ungenutzte Importe zurück (tsc TS6133);
NBSP-Zeichen in Testerwartungen als ` ` schreiben, nie als Literal.

## 2) Browser-Beweis (Preview-MCP)

- Server: `preview_start` mit `web-dev` (aus `.claude/launch.json`). Hängt Port 5173:
  Prozess prüfen (`wmic process where ProcessId=<pid> get CommandLine`) — ist es ein
  verwaister Vite, killen und neu starten.
- Login: `admin@eventtech.local` / `EventTech2026!`.
- **Das neue Verhalten real durchspielen** (klicken, ausfüllen, Ergebnis ablesen) — nicht
  nur Screenshot. Formularfelder in React über den nativen Value-Setter befüllen
  (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set` + `input`-Event).
- `preview_console_logs` (level error) muss leer sein. Bei Layout-Änderungen zusätzlich
  `preview_resize` 375px + Desktop.
- Hängt `preview_screenshot` (Timeout): Inhalte stattdessen per `preview_eval` +
  `document.body.innerText` verifizieren — der Beweis zählt, nicht das Bild.

## 3) DB-Beweis (bei Schema-/Logikänderungen)

```bash
docker exec -i supabase_db_eventtech-manager psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
-- Szenario aufbauen, Verhalten abfragen, Schutzregeln absichtlich verletzen (müssen scheitern)
SQL
```

- Nummernkreise/Locks immer im **Parallelfall** testen: zwei gleichzeitige Aufrufe
  (zwei `docker exec … &`-Prozesse + `wait`) → Ergebnis muss lückenlos/dublettenfrei sein.
- Schutz-Trigger testen, indem man das Verbotene versucht und die Fehlermeldung prüft.

## 4) Testdaten-Disziplin

- Testdatensätze bekommen das Titel-Präfix `TEST-…` und werden **nach dem Beweis gelöscht**.
- Löschgeschützte Datensätze (z. B. gestellte Rechnungen): Schutz-Trigger kurz aus- und
  wieder einschalten — nur lokal, nie in der Cloud:
  `alter table invoices disable trigger trg_invoices_protect; … ; enable …`
- Zum Schluss `select count(*)` als Beleg, dass nichts übrig ist.

## 5) Commit & Push

```bash
git add -A && git commit -m "<was + warum, deutsch>

Co-Authored-By: Claude <noreply@anthropic.com>" && git push
```

CRLF-Warnungen sind normal (Windows). Kleine Commits pro Teilschritt.

## 6) Deploy überwachen (nach jedem Push auf main)

`gh` ist nicht installiert — die **öffentliche GitHub-API** nutzen:

```bash
curl -s "https://api.github.com/repos/Tillli0/EventTech-Manager/actions/runs?per_page=6"
# → Runs zum eigenen head_sha filtern: CI + ggf. "Supabase DB Migrate (Produktion)"
```

- Lange Läufe nicht mit sleep-Ketten abfragen, sondern einen Monitor/Hintergrundlauf
  aufsetzen und erst bei Abschluss weitermachen.
- **Beide grün?** Bei Migrationen zusätzlich in der Cloud verifizieren (nur lesend):
  `supabase db query --linked "select … from information_schema.tables where table_name='…'" -o table`
- **Rot?** Job-Schritte über `…/actions/runs/<id>/jobs` ansehen. Bekannte Ursachen:
  pnpm-Setup-Konflikt (keine `version:` im Workflow — kommt aus `packageManager`),
  `supabase/setup-cli` nicht auf `latest` lassen (Version pinnen). Fix pushen; der
  db-migrate-Workflow triggert auch auf Änderungen an seiner eigenen Datei nach.
- **Niemals** als Abkürzung `supabase db push` direkt auf Produktion ohne Freigabe.

## 7) Bericht

Knapp und ehrlich: was umgesetzt & gepusht (Commit-Hash), welcher Beweis erbracht wurde,
was offen ist / bewusst nicht gemacht wurde, welche Entscheidungen anstehen.
