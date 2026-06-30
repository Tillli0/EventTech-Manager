-- 0034: Job-Status-Workflow erweitern.
--
-- Bisher: anfrage, bestaetigt, laeuft, abgeschlossen, storniert.
-- Neu dazwischen: planung (Packliste wird erstellt), packen (Geräte werden
-- ausgegeben), rueckgabe (Geräte werden zurückgenommen) — so spiegelt der
-- Job-Status den tatsächlichen Packlisten-Fortschritt:
--   Anfrage → Bestätigt → Planung → Packen → Läuft → Rückgabe → Abgeschlossen
-- (Storniert weiterhin jederzeit erreichbar.)
--
-- ALTER TYPE ... ADD VALUE läuft außerhalb expliziter Transaktionen (psql
-- autocommitted je Anweisung) und ist daher hier unproblematisch.

alter type job_status add value if not exists 'planung' after 'bestaetigt';
alter type job_status add value if not exists 'packen' after 'planung';
alter type job_status add value if not exists 'rueckgabe' after 'laeuft';

notify pgrst, 'reload schema';
