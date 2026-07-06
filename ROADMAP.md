# ROADMAP — Langzeit-Ziel & Vorgehen (EventTech-Manager)

> Der Nordstern für alle Sessions. Wird oben aktuell gehalten (Phase abhaken, Datum).
> Details großer Vorhaben stehen in eigenen `PLAN-*.md`; laufender Stand in `IDEAS.md`.

## Das Langzeit-Ziel

EventTech-Manager soll das **vollständige, vertrauenswürdige Betriebssystem** von Tills
Eventtechnik-Verleih werden. „Fertig genug" ist erreicht, wenn:

1. **Das ganze Geschäft läuft darüber** — von der Anfrage bis zur bezahlten Rechnung, ohne
   Zettel/Excel daneben.
2. **Datenverlust praktisch unmöglich ist** — automatische Backups, getesteter
   Wiederherstellungs-Weg, Daten in eigener Hand.
3. **Es von schwächeren Modellen sauber weitergebaut werden kann** — weil Muster,
   Invarianten und Rituale dokumentiert sind und Automationen Fehler abfangen.

Alles unten dient diesen drei Punkten.

## Wie wir arbeiten (dauerhaft — gilt für jede Session)

Der Bogen aus Skill `grosses-feature`: **verstehen** (bei Vagem Optionen anbieten statt
raten) → **recherchieren** (wie lösen es Profi-Tools?) → **zeigen** (Vorschau vor Umbau) →
**planen** (Plan-Dok im Repo, offene Entscheidungen markieren) → **Freigabe** → **bauen in
Etappen mit Beweis** (Skill `feature-fertigstellen`) → **Doku nachziehen**.

Prinzipien: Backend ist die Wahrheit · beweisen statt behaupten · wiederverwenden vor
neubauen · nach außen Wirkendes standardmäßig ruhig + Freigabe · klein committen. (Voll
ausgeschrieben in `CLAUDE.md`.)

## Wie ein starkes Modell (Fable) einzusetzen ist

Für **„einmal schwer, dafür für immer wertvoll"**: Fundament, Sicherheit, Architektur und
das **Vorab-Design** der harten Features. **Nicht** für Muster-Folge-Arbeit (die kann ein
schwächeres Modell anhand des Listen-Rezepts und der Skills). Solange ein starkes Modell
verfügbar ist, Phase 0 priorisieren und die harten Phase-2/3-Features wenigstens als
Plan-Dokumente fertig entwerfen.

## Die Phasen (Reihenfolge = Priorität)

### Phase 0 — Fundament unzerstörbar machen  *(JETZT, mit dem stärksten Modell)*
- **Datensicherheit:** automatisches tägliches Backup der Cloud-DB **inkl. Storage-Dateien**
  + ein **real getesteter** Wiederherstellungs-Weg. (Ergänzt das manuelle JSON-Backup.)
- **Sicherheitsnetz:** Vitest-Abdeckung um die Invarianten (Rechnungsnummer/GoBD-Schutz,
  Verfügbarkeit inkl. Set-Auflösung, Mahn-Berechtigung, Summen/Gruppierung) + E2E-Smoke
  (Login → Job → Packliste → Rechnung).
- **Automationen** (machen Qualität modell-unabhängig):
  - CI-Guardrails: „kein Service-Role-Key im Frontend", „neue Migration ohne GRANT/RLS",
    „Migrations-Nummern lückenlos" als harte Checks.
  - Geplante Aufgaben: nächtliches Backup; wöchentlicher Report „überfällige Rechnungen +
    fällige DGUV-Prüfungen".

### Phase 1 — Kern-Workflow schließen
- Mahnwesen scharf schalten (Resend-Key, Function deployen, Vorschau-Test).
- Angebot & Rechnung **per E-Mail** an den Kunden (Versand-Protokoll).
- **Übergabe-/Rücknahmeprotokoll** mit Unterschrift (Beweis bei Schaden/Verlust).

### Phase 2 — Operative Intelligenz
- **Personal-Konflikte** (recycelt die Verfügbarkeits-Engine `lib/availability.ts`).
- Reporting/Auswertungen vertiefen (Geräte-ROI, Trends).
- Kalender-Politur (Design-Stufe 4) — bewusst „leicht", schwächeres-Modell-tauglich.

### Phase 3 — Reife & Skalierung
- **Globale Suche + Änderungsprotokoll** (⌘K über alle Bereiche, Audit-Log per Trigger).
- Rechte-Feinschliff, Performance/Code-Splitting (`react-pdf` lazy ist schon getan).

### Phase 4 — Betrieb & Autonomie
- App trägt den Alltag; schwächere Modelle pflegen über Muster; Automationen fangen
  Regressionen; Wartungs-/Notfall-Runbooks (Restore-Drill) stehen bereit.

## Weiterführen

Jede Session: `IDEAS.md` + aktives `PLAN-*.md` lesen, Skills nutzen, kleine **bewiesene**
Schritte, diese Datei oben aktuell halten. Große Blöcke erst als `PLAN-*.md` entwerfen
(offene Entscheidungen mit Till klären), dann bauen.
