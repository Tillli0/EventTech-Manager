-- 0040: neuer Rechte-Bereich `anmietung` (Block B — Anmietung & Kalkulation).
--
-- Till stellt sein Geschäftsmodell vom Technik-Verleih auf Event-Dienstleister
-- um: Technik wird künftig überwiegend bei fremden Verleih-Partnern angemietet.
-- Dafür braucht es einen eigenen Rechte-Bereich, der ab E1 den Verleih-Partner-
-- Stamm (`suppliers`) schützt und in E2+ die Anmiet-Vorgänge, Bestell-PDFs und
-- die Kalkulation absichert (siehe PLAN-NEUAUSRICHTUNG.md, Block B).
--
-- ENUM-Falle: ALTER TYPE ... ADD VALUE läuft außerhalb expliziter Transaktionen
-- (psql autocommitted je Anweisung), darf aber NICHT in derselben Migration wie
-- die erste Nutzung des neuen Werts stehen (die Cloud-Pipeline führt jede Datei
-- in einer Transaktion aus -> "unsafe use of new value"). Diese Datei enthält
-- deshalb ausschließlich den ADD VALUE; `suppliers` + RLS folgen in 0041.
-- Präzedenz: 0034_job_status_workflow.sql.

alter type app_area add value if not exists 'anmietung';

notify pgrst, 'reload schema';
