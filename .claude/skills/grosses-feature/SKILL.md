---
name: grosses-feature
description: >-
  Vorgehen für GROSSE Vorhaben im EventTech-Manager (neue Domäne, Schema + RLS + UI + PDF,
  Redesigns, nach-außen-wirkende Features wie E-Mail-Versand). Nutze diesen Skill, wenn
  Till ein großes Feature anstößt, einen Plan/Prompt für eine neue Session verlangt, nur
  ein vages Unbehagen äußert („ich bin unzufrieden wie …", „das hat kein System"), oder
  wenn mehrere Blöcke priorisiert werden sollen. Er beschreibt den vollständigen Bogen:
  Bauchgefühl → gezielte Fragen → Recherche (wie machen es Profi-Tools?) → Vorschau →
  Plan-Dokument → Freigabe → Etappen mit Beweis → Doku nachziehen.
---

# Großes Feature — vom Bauchgefühl zum ausgelieferten Baustein

Till ist Product Owner, kein Entwickler. Die Qualität entsteht durch diesen Bogen —
Abkürzungen (sofort drauflosbauen) erzeugen genau die Unordnung, die er nicht will.

## 1) Verstehen: Bauchgefühl ernst nehmen, Optionen statt Gegenfragen

Vage Aussagen („mir gefällt nicht, wie Sachen gespeichert sind") nie wörtlich raten:
**2–4 konkrete Deutungen als Auswahl anbieten** (AskUserQuestion), jede mit einem Satz
Beschreibung. Dann anhand der Antwort weiter eingrenzen. Erst wenn das Problem benannt
ist („die Listen haben kein System"), geht es weiter.

## 2) Recherchieren: Wie lösen es die Profis?

Vor dem Entwurf prüfen, wie etablierte Software das Problem löst — für dieses Projekt
sind die Messlatten: **Rentman/Current RMS/HireHop** (Eventtechnik-Verleih) und
**lexoffice/sevDesk** (deutsches Rechnungswesen/GoBD). Die gefundenen Muster in 3–6
Bausteine destillieren und auf den Ist-Zustand des Codes mappen (was existiert schon,
was fehlt). Immer zuerst den echten Code-Stand erheben — nie aus der Erinnerung planen.

## 3) Zeigen: Vorschau vor Umsetzung

Bei UI-lastigen Vorhaben ein visuelles Mockup der Ziel-Ansicht rendern (Design-Tokens
aus `apps/web/tailwind.config.js` verwenden, Dark/Indigo). Till entscheidet anhand des
Bildes — das erspart Fehlbauten.

## 4) Planen: Plan-Dokument im Repo, nicht im Chat

Großes bekommt ein `PLAN-<THEMA>.md` im Projektstamm (überlebt Sessions/Kompaktierung):

- **Kontext/Warum** (das verstandene Problem, die recherchierten Muster),
- **Etappen**, jede einzeln lieferbar, mit **Aufsetzpunkten im Code** (konkrete Dateien
  und wiederverwendbare Bausteine — Wiederverwenden vor Neubauen!),
- **offene Entscheidungen** ausdrücklich markieren (werden VOR dem Bau mit Till geklärt),
- **Verifikation** je Etappe, **Risiken/Fallen**.

Bestehende Plan-Dokumente (`PLAN-FABLE5.md`, …) und `IDEAS.md` vorher lesen und danach
aktuell halten (Stand-Vermerk oben, Erledigtes abhaken).

## 5) Bauen: Etappen mit eigenem Beweis und Commit

- Reihenfolge: Fundament zuerst (geteilte Bausteine/Tests), dann die sichtbaren Etappen.
- Jede Etappe endet mit dem vollen Ritual aus Skill `feature-fertigstellen`
  (Prüfkette, Browser-/DB-Beweis, Testdaten weg, Commit+Push, Actions überwachen).
- Schema-Änderungen strikt nach Skill `db-migration`.
- **Nach-außen-Wirkendes** (E-Mails, Secrets, Function-Deploys) wird „standardmäßig ruhig"
  gebaut: Feature sichtbar, Wirkung erst nach Tills bewusstem Scharfschalten (z. B. fehlt
  der `RESEND_API_KEY`, gibt es eine klare Fehlermeldung statt Versand). Vor dem
  Scharfschalten immer ausdrückliche Freigabe einholen.

## 6) Übergeben: Prompts für neue Sessions

Soll eine andere Session das Vorhaben ausführen, einen **selbsttragenden Prompt**
schreiben: Auftrag + Reihenfolge, Verweis auf das Plan-Dokument (Details dort, nicht im
Prompt duplizieren), Arbeitsregeln-Kurzfassung (Verifikations-Ritual, Migrations-Regeln,
Freigabepflichten), Wiederverwendungs-Hinweise mit Dateipfaden, und die Anweisung, vor
Migrationen/Edge Functions erst einen Plan zur Bestätigung vorzulegen. Plan-Dokument
vorher committen/pushen, damit die neue Session es im Repo vorfindet.

## 7) Abschließen: Doku und Bericht

`IDEAS.md` („Kürzlich umgesetzt" mit Datum und Kernentscheidungen) und das Plan-Dokument
nachziehen. Bericht an Till: was live ist (Commits), welcher Beweis erbracht wurde, was
bewusst ruhig/offen blieb, welche Entscheidungen als Nächstes anstehen.
