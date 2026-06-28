-- 0027: DGUV V3 Elektroprüfung pro Gerät. Letzte und nächste Prüfung als Datum,
-- damit fällige/überfällige Prüfungen erinnert werden können. Non-destruktiv.

alter table devices add column if not exists last_inspection_date date;
alter table devices add column if not exists next_inspection_date date;

notify pgrst, 'reload schema';
