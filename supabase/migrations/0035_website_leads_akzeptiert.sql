-- 0035: Website-Leads-Status vereinfacht -> Neu / Akzeptiert / Verworfen.
--
-- Der frühere Zwischenschritt "bearbeitet" (Lead wurde zu Kunde/Anfrage-Pipeline
-- konvertiert) entfällt. Neuer Ablauf: eine Web-Anfrage wird entweder
-- "akzeptiert" (dabei wird automatisch ein Job erstellt) oder "verworfen".
-- Non-destruktiv: bestehende 'bearbeitet'-Leads werden auf 'akzeptiert' migriert.

alter table website_leads drop constraint if exists chk_website_leads_status;

update website_leads set status = 'akzeptiert' where status = 'bearbeitet';

alter table website_leads
  add constraint chk_website_leads_status
  check (status in ('neu', 'akzeptiert', 'verworfen'));

notify pgrst, 'reload schema';
