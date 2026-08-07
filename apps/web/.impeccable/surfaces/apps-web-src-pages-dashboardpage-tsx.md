---
version: 1
slug: "apps-web-src-pages-dashboardpage-tsx"
primary_target: "apps/web/src/pages/DashboardPage.tsx"
related_targets: ["apps/web/src/components/dashboard/NextJobHero.tsx","apps/web/src/components/dashboard/ProgressRing.tsx"]
---

## Scope & Modus
Startseite (`apps/web/src/pages/DashboardPage.tsx` + `components/dashboard/*`). Modus: Operate.

## Zielgruppe & Aufgabe
Till (Admin) und kleines Team, tägliche Mehrfachnutzung. Aufgabe: in Sekunden erfassen,
was jetzt zählt (nächster Einsatz, Kennzahlen, fällige Aufgaben, neue Anfragen, offene
Anmietungen, anstehende Jobs, zuletzt abgelegte Dokumente, Rest-Inventar) und direkt
handeln (Job öffnen, Packliste, Rechnung stellen …).

## Proof/Inhalt
Echte, aus bestehenden Hooks geladene Domänendaten — keine erfundenen Kennzahlen.

## Constraints
Farbsystem fix (Creme/Schwarz-Akzent Standard-Theme, Indigo-Akzent im Theme
Weiß+Indigo — beides automatisch über Tailwind-Tokens, keine neue Palette). Bestehende
Basis-Komponenten wiederverwenden. 375px + Desktop Pflicht.

## Gewählte Richtung
"Instrumentenbrett": ein echter Zeit-Fortschritts-Ring als Hauptinstrument für den
nächsten Einsatz (`lib/jobProgress.ts`, `components/dashboard/ProgressRing.tsx`),
Kennzahlen als eine durchgehende, ungeteilte Instrumenten-Leiste (Haarlinien-Trenner
statt fünf einzelner Kacheln) statt Zeiger-Dials pro Kennzahl (Scanbarkeit-Kompromiss,
im Chat mit Till abgestimmt). Listen-Sektionen bleiben strukturell nah am bisherigen
Grundgerüst (laut `PRODUCT.md` „Ausgangsmaterial, nicht gescheiterte Idee"), aber
handwerklich neu ausgeführt: keine farbigen Akzentbalken, keine Icon-in-Farbbox-Kacheln,
keine Hover-Lift-Karten.

## Merk-Moment
Der große Ring, der beim Laden seinen echten Fortschritt einzeichnet — das einzige
bewusst gesetzte Instrument der Seite.

## Offene Entscheidungen
Keine — Struktur und Kompromiss sind mit Till abgestimmt (Chat, 2026-08-07).
