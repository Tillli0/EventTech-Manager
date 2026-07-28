-- 0051: Programmpunkte um Notiz und Ende erweitern (PLAN-EVENT-PLANUNG.md P2a).
--
-- Design-Entscheidungen:
-- * Beide Spalten nullable, non-destruktiv — bestehende Programmpunkte bleiben
--   gueltig (Punkt-Termin ohne Ende).
-- * "notes" traegt die internen Details (z.B. "Bruecke wird gebraucht"), die der
--   Ablaufplan (P2b) je nach Schalter "interne Notizen mitdrucken" ein-/ausblendet.
-- * "end_at" macht aus einem Zeitpunkt einen Zeitraum ("08:00-12:00 Aufbau") —
--   Voraussetzung fuer den Ablaufplan und fuer P5 (Zeit vor Ort der Gewerke).
-- * Keine RLS-/GRANT-Aenderung noetig: job_milestones ist bereits vollstaendig
--   abgesichert (0012/0016), zusaetzliche Spalten aendern daran nichts.

alter table job_milestones add column notes text;
alter table job_milestones add column end_at timestamptz;

notify pgrst, 'reload schema';
