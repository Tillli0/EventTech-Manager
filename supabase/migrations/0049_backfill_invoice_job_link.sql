-- 0049: Job<->Angebot<->Rechnung nachziehen (P0-Befund, PLAN-EVENT-PLANUNG.md Etappe A).
--
-- offers.job_id (0024) und invoices.job_id/offer_id (0036) existieren im Schema,
-- wurden bisher aber nur von der Packliste-zu-Angebot-Erzeugung gesetzt
-- (components/jobs/PacklistSection.tsx). Alle anderen Angebote/Rechnungen haben
-- job_id = null, wodurch die Job-Kalkulation (lib/jobCosting.ts) den Erlös nie
-- sieht ("Erlös 0,00 EUR" trotz gestellter Rechnung).
--
-- Reines Nachziehen bestehender Daten, keine neue Tabelle/Spalte: jede Rechnung,
-- die über ein Angebot mit gesetztem job_id entstanden ist, aber selbst noch
-- keinen job_id hat, übernimmt ihn vom Angebot.

update invoices i
set job_id = o.job_id
from offers o
where i.offer_id = o.id
  and i.job_id is null
  and o.job_id is not null;

notify pgrst, 'reload schema';
