# EventTech-Manager — Projektleitfaden für Claude

## Arbeitsweise: Commit & Push nach jeder fertigen Aufgabe

**Verbindlich:** Sobald eine Teilaufgabe fertig **und verifiziert** ist (`pnpm --filter @eventtech/web exec tsc --noEmit`, ESLint und Build grün), wird sie **direkt auf `main` committet und auf GitHub gepusht**:

```bash
git add -A
git commit -m "<aussagekräftige Nachricht>"
git push
```

- Commit-Nachricht knapp und aussagekräftig (was + warum), auf Deutsch passend zum Projekt.
- Commit-Trailer anhängen: `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Nicht sammeln: lieber kleine, in sich abgeschlossene Commits pro Teilaufgabe als ein großer.
- Vor dem Commit immer erst verifizieren (tsc + eslint + build). Nie roten Stand pushen.

## Weiterentwicklungs-Modus: Standard bei jeder Anfrage — „+" schaltet ihn AUS

**Standard (Nachricht OHNE führendes `+`):** die App proaktiv weiterentwickeln. Dann:

1. **Etwaige konkrete Aufgabe** in der Nachricht zuerst erledigen.
2. **Kleine, risikoarme Verbesserungen eigenständig umsetzen** und nach der üblichen
   Verifikation (tsc + eslint + build) committen & pushen. Klein/risikoarm = reines
   Frontend ohne Schema-Änderung, UI-Politur, Copy/Texte, offensichtliche Fixes,
   ESLint-Aufräumen. **Nicht** eigenständig: Migrationen/neue Tabellen, Edge Functions,
   Auth/RLS, Datenmigrationen, bereichsübergreifende Refactors, irgendetwas
   nach-außen-Wirkendes (Cloud-Function-Deploy, Secrets, Mails). Solche **größeren**
   Features werden **vorgeschlagen, nicht ungefragt umgesetzt**.
3. **`IDEAS.md` pflegen:** neue Ideen ergänzen, priorisieren, Umgesetztes in „Kürzlich
   umgesetzt" verschieben.
4. **Immer berichten:** kurz auflisten, was umgesetzt & gepusht wurde (mit Commit-Bezug),
   und welche größeren Ideen zur Auswahl anstehen.

**Beginnt die Nachricht mit `+`:** NUR die genannte Aufgabe erledigen — **keine**
eigenständige Weiterentwicklung, nichts darüber hinaus umsetzen/pushen.

## Projekt-Orientierung

- **Monorepo (pnpm):** Web-App unter `apps/web` (`@eventtech/web`, Vite + React + TypeScript + TanStack Query + Tailwind, Dark-Theme). Supabase-Projekt unter `supabase/`.
- **Selbst gehostetes Supabase via CLI** (Docker). Grundsatz: **„Backend (RLS) ist die Wahrheit"** — Rechte werden in Postgres-Policies erzwungen, die UI blendet nur zusätzlich aus.
- **Sicherheit:** Der lokale Stack nutzt Default-/Shared-JWT-Secrets → **niemals das ganze Backend öffentlich exponieren**. Service-Role-Key nur serverseitig (Edge Functions).

## Wichtige Stolpersteine (aus Erfahrung)

- **Neue Tabellen brauchen explizite GRANTs** (`grant ... to authenticated, service_role`) — es gibt kein Auto-Expose; sonst stille leere Daten / 403.
- **RLS-Policies** für neue Domänentabellen am Bereichs-Muster aus `supabase/migrations/0012_auth_roles_and_access.sql` orientieren (`has_area(...)` / `can_edit_area(...)`).
- **Neue/geänderte Edge Functions** werden erst nach `supabase stop && supabase start` aktiv.
- **Migrationen** non-destruktiv und fortlaufend nummeriert in `supabase/migrations/` ablegen; auf die laufende DB anwenden.

## Befehle

- Dev: `pnpm dev` · Build: `pnpm build` · Lint: `pnpm lint`
- Typecheck (Web): `pnpm --filter @eventtech/web exec tsc --noEmit`
