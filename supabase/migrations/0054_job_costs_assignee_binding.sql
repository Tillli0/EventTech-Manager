-- 0054: Kostenvorschlag ohne Doppelzählung (PLAN-EVENT-PLANUNG.md P4/E2).
--
-- Design-Entscheidungen:
-- * job_costs.assignee_user_id bindet eine erzeugte Personalkosten-Zeile an die
--   Zuweisung, die sie ausgelöst hat. Erzeugte Zeilen tragen die Spalte, von Hand
--   angelegte Zeilen lassen sie NULL — die kollidieren nie und werden nie
--   überschrieben. Zweites Anwenden des Kostenvorschlags ist damit ein upsert auf
--   (job_id, assignee_user_id), keine zweite Kostenzeile (Doppelzähl-Falle aus dem
--   Plan). Der Unique-Index unten ist bewusst NICHT partiell (kein WHERE): Postgres
--   behandelt NULL in Unique-Indizes ohnehin als "nie gleich sich selbst", die
--   Semantik ist identisch — aber PostgREST kann ON CONFLICT nur gegen einen
--   Index ohne WHERE-Klausel auflösen (sonst Fehler 42P10 "no unique or exclusion
--   constraint matching the ON CONFLICT specification").
-- * on delete set null (nicht cascade): wird die Person vom Job abgezogen, war die
--   Arbeit trotzdem gemacht — die Kostenzeile bleibt als eigenständiger, jetzt
--   nicht mehr automatisch aktualisierter Eintrag bestehen.
-- * Eigene Tabelle cost_settings statt company_settings für default_hourly_rate:
--   company_settings_sel erlaubt JEDEM authentifizierten Nutzer Lesen (Briefkopf
--   fürs PDF), unabhängig vom Bereich — ein Standard-Stundensatz dort wäre also
--   für ein Crew-Mitglied mit nur Bereich 'jobs' (ohne 'anmietung') lesbar. Das
--   wäre exakt die E-E-Falle (Stundensätze/Preise sind kein allgemein lesbares
--   Datum), nur über einen anderen Tisch. cost_settings ist deshalb wie job_costs
--   auf den Bereich 'anmietung' beschränkt (has_area/can_edit_area), nicht auf
--   is_admin() — dieselbe Rolle, die auch die übrigen Kosten-Daten sieht/pflegt.
-- * Bestandsdaten: vorhandene cost_type='personal'-Zeilen mit profile_id bekommen
--   assignee_user_id nachgezogen, damit useAdoptAssignedAsCosts direkt auf den
--   neuen Schlüssel umsteigen kann, ohne bestehende Zeilen zu verwaisen (aktuell
--   0 betroffene Zeilen, aber non-destruktiv für künftige Daten).

create table cost_settings (
  id boolean primary key default true constraint chk_cost_settings_singleton check (id),
  default_hourly_rate numeric(8,2)
    constraint chk_cost_settings_default_hourly_rate check (default_hourly_rate is null or default_hourly_rate >= 0),
  updated_at timestamptz not null default now()
);

create trigger trg_cost_settings_updated_at
  before update on cost_settings
  for each row execute function set_updated_at();

alter table cost_settings enable row level security;

create policy cost_settings_sel on cost_settings for select using (has_area('anmietung'));
create policy cost_settings_ins on cost_settings for insert with check (can_edit_area('anmietung'));
create policy cost_settings_upd on cost_settings for update using (can_edit_area('anmietung')) with check (can_edit_area('anmietung'));

grant select, insert, update on cost_settings to authenticated;
grant all on cost_settings to service_role;

insert into cost_settings (id, default_hourly_rate) values (true, null)
on conflict (id) do nothing;

alter table job_costs add column assignee_user_id uuid references profiles(id) on delete set null;

update job_costs
set assignee_user_id = profile_id
where cost_type = 'personal' and profile_id is not null;

create index idx_job_costs_assignee_user on job_costs(assignee_user_id);

create unique index uniq_job_costs_assignee
  on job_costs(job_id, assignee_user_id);

notify pgrst, 'reload schema';
