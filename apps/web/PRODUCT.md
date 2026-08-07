# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Till selbst (Betreiber, Product Owner, kein Programmierer) und sein kleines Team/Crew
(Mitarbeitende mit rollenbasiertem Zugriff über Bereiche wie „angebote", „anmietung").
Interne Betriebssoftware, kein Kundenzugang — Kunden sehen nur das externe
Website-Kontaktformular, das Leads ins System speist. Täglicher, wiederholter Gebrauch
(die Startseite wird „taeglich vielfach geoeffnet").

## Product Purpose

EventTech-Manager ist das Betriebssystem für Tills Event-Dienstleistung: plant und setzt
Veranstaltungen um, mietet die benötigte Technik überwiegend bei Partner-Verleihern an
(kleines eigenes Rest-Inventar). Kernablauf: Anfrage → Angebot → Job (Material eigen +
angemietet · Personal · Fremdgewerke · Dokumente) → Bestellungen an Verleiher → Rechnung →
Zahlung → Nachkalkulation. Erfolg heißt: nichts fällt zwischen Anfrage und Nachkalkulation
durch den Rost, und der nächste anstehende Einsatz ist immer sofort erkennbar.

## Positioning

Kein generisches Task-/Projekt-Tool — die Domänenlogik (GoBD-feste Rechnungsnummern,
Verfügbarkeits-Berechnung über zeitraum-überlappende Jobs, Deckungsbeitrag je Job) ist
in der Datenbank erzwungen, nicht nur in der Oberfläche behauptet. Qualitätsanspruch:
„wie professionelle Branchen-Software" (Rentman/Current RMS für den Verleih-Workflow,
lexoffice/sevDesk für Rechnungswesen/GoBD).

## Operating Context

- Rollen/Bereiche steuern Sichtbarkeit: `hasArea("angebote")` zeigt Geld (offene
  Rechnungen), `hasArea("anmietung")` zeigt Anmiet-Vorgänge. Nicht-Admin-Nutzer sehen
  „ihre" zugewiesenen Jobs/Aufgaben eher als die globale Admin-Sicht.
- Die Startseite (Dashboard/Übersicht) ist der tägliche Einstiegspunkt: nächster
  anstehender Einsatz, Kennzahlen, anstehende Jobs, neue Website-Anfragen, fällige
  Aufgaben, offene Anmietungen, zuletzt abgelegte Dokumente, Rest-Inventar-Auslastung.
- Genutzt auf Desktop im Büro und mobil unterwegs (Baustellen-/Einsatz-Kontext) —
  375px-Mobilansicht ist Pflichtprüfung, nicht nice-to-have.

## Capabilities and Constraints

- Backend ist die Wahrheit (Postgres RLS, Constraints, Trigger, Advisory Locks); die
  Oberfläche blendet nur aus Komfort aus.
- Bestehendes, gepflegtes Design-System (siehe `apps/web/CLAUDE.md`): Token-first,
  keine Hex-Werte in Komponenten außer DB-Farben. Drei Themes umschaltbar — **Creme**
  (Standard), **Weiß+Indigo**, **Dunkel** (nicht mehr aktiv gepflegt). Schrift: Inter,
  Zahlen/Beträge durchgehend `font-mono` + tabular. Bestehende Basis-Komponenten
  (`Button`, `Card`, `StatusBadge`, `States`, `SummaryStats` …) sind Pflicht statt
  Eigenbau.
- Diese Anfrage gilt für die Startseite/Übersicht (`DashboardPage.tsx`) — Struktur darf
  sich grundlegend ändern, das bestehende Farbsystem/Token-Set (Creme + Indigo-Akzent)
  bleibt die Grundlage: **hell soll es bleiben**, kein neues Farbsystem.
- Heute (2026-08-07) wurde ein erstes Redesign dieser Seite (vier Zonen statt
  Kartenwand: Zahlenband, Job-Hero, „Was jetzt zählt"-Handlungsliste, Haarlinien-Listen)
  bereits versucht und wieder zurückgerollt. Grund laut Till: nicht „wirklich schön"
  genug für den professionellen Anspruch — kein Strukturproblem, sondern ein
  handwerklich-optisches. Das Fundament der bisherigen Struktur (Kennzahlen-Kacheln,
  Job-Hero, zweispaltige Listen-Sektionen) gilt hier als Ausgangsmaterial, nicht als
  gescheiterte Idee, die zu meiden ist.

## Brand Commitments

Deutsche UI-Sprache, kurze direkte Texte in Tills eigenem Wortschatz („Rechnung stellen",
„ausgebucht"). Creme als Standard-Theme, Indigo als Akzentfarbe — beides bestätigt und
gepflegt, nicht zur Disposition in dieser Aufgabe.

## Evidence on Hand

Reale, laufende Anwendung mit echten Domänendaten (Jobs, Kunden, Rechnungen,
Anmietungen, Dokumente, Inventar). Keine erfundenen Kennzahlen nötig — die Übersicht
zeigt echte, aus Hooks geladene Werte.

## Product Principles

- Backend ist die Wahrheit; die UI blendet nur aus Komfort aus.
- Wiederverwenden vor Neubauen — Design-System-Token und Basis-Komponenten zuerst.
- Der nächste anstehende Einsatz ist die wichtigste Information auf der Seite.
- Beweisen statt behaupten: jedes Feature endet mit echtem Browser-/DB-Beweis.
- Hell, professionell, mit echtem handwerklichen Anspruch — kein austauschbares
  SaaS-Dashboard-Klischee.

## Accessibility & Inclusion

Icon-Buttons brauchen `aria-label` + `title`. Statusfarben werden gegen Creme UND Weiß
auf Kontrast geprüft (Ziel ≥ 4,5:1).
