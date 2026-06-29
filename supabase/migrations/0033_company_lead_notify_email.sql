-- 0033: Empfänger-Adresse für Benachrichtigungen bei neuen Website-Anfragen.
--
-- Der Admin pflegt sie zusammen mit den übrigen Firmendaten. Die Edge Function
-- public-lead liest diese Adresse (per Service-Role) und verschickt — sofern ein
-- RESEND_API_KEY als Secret gesetzt ist — bei jeder neuen Anfrage eine Mail dorthin.

alter table company_settings add column if not exists lead_notify_email text;

notify pgrst, 'reload schema';
