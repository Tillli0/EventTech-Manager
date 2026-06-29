-- 0032: Spam-Drosselung für das öffentliche Lead-Formular.
--
-- Die Edge Function public-lead speichert pro Einsendung einen SHA-256-Hash der
-- Absender-IP (nicht die IP selbst → datenschonend) und lehnt weitere Einsendungen
-- ab, wenn von derselben IP innerhalb einer Stunde zu viele kommen. Der Index macht
-- die Zähl-Abfrage (ip_hash + Zeitfenster) schnell.

alter table website_leads add column if not exists ip_hash text;
create index if not exists idx_website_leads_ip_hash_created on website_leads(ip_hash, created_at desc);

notify pgrst, 'reload schema';
