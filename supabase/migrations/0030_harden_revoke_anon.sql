-- 0030: Härtung für den öffentlichen Betrieb (Cloudflare + Supabase Cloud).
--
-- Aus dem früheren lokalen No-Login-Betrieb hat die Rolle `anon` noch
-- Tabellen-/Sequenz-Rechte (siehe 0004–0011). Mit aktivem RLS sind diese zwar
-- wirkungslos (alle Policies gaten auf has_area/can_edit_area/is_admin/auth.uid(),
-- was für nicht eingeloggte Zugriffe false ist), aber für ein öffentlich
-- erreichbares Deployment ziehen wir sie zur Sicherheit (Defense-in-Depth) ein.
--
-- Die App arbeitet ausschließlich eingeloggt (Rolle `authenticated`); der
-- Kalender-Feed/Lead-Endpunkt läuft serverseitig über `service_role`. `anon`
-- braucht daher keinerlei Tabellenzugriff. Login (GoTrue, auth-Schema) ist davon
-- nicht betroffen.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- Künftig angelegte Objekte erst gar nicht an anon vergeben.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

notify pgrst, 'reload schema';
