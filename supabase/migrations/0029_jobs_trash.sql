-- 0029: Papierkorb für Jobs (Soft-Delete). Jobs werden zunächst in den Papierkorb
-- verschoben (deleted_at gesetzt) und können wiederhergestellt oder mit Warnung
-- endgültig gelöscht werden. Non-destruktiv.

alter table jobs add column if not exists deleted_at timestamptz;
create index if not exists idx_jobs_deleted_at on jobs(deleted_at);

notify pgrst, 'reload schema';
