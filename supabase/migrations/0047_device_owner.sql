-- 0047: Eigentümer-Feld am Gerät (Block B / E10).
--
-- Der Regelfall bleibt "gehört der Firma" (Default), aber manche Geräte im System
-- gehören einem Dritten, der trotzdem im Bestand geführt wird — z. B. komplettes
-- Schul-Inventar oder eine privat geliehene Nebelmaschine (Till: "Anton"). Fixe
-- Auswahl statt Freitext (feste, auswertbare Kategorien), text+check statt echtem
-- ENUM nach dem Muster der neueren Block-B-Migrationen (subrentals.status/
-- logistics in 0042, job_costs.cost_type in 0045) — vermeidet die ENUM-
-- Transaktionsfalle, falls je ein vierter Eigentümer-Typ dazukommt.
--
-- `counts_toward_value` ist zukunftsgerichtet: kein aggregierter Inventarwert-
-- Bericht existiert heute, das Feld wird nur gespeichert/vorbelegt, damit ein
-- späterer Bericht wählen kann, ob Fremdeigentum mitgezählt wird. DB-Default
-- `true` (passt für den Regelfall "firma"); dass Fremdeigentum standardmäßig
-- NICHT mitzählt, steuert das Frontend beim Anlegen (kein DB-Constraint nötig,
-- kein Geld-/Rechts-Feld).

alter table devices
  add column owner_type text not null default 'firma'
    constraint chk_devices_owner_type check (owner_type in ('firma', 'schule', 'privat')),
  add column owner_name text,
  add column counts_toward_value boolean not null default true;

notify pgrst, 'reload schema';
