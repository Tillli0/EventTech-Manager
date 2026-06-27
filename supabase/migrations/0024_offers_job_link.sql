-- 0024: Angebote optional mit einem Job verknüpfen.
-- Wird gesetzt, wenn ein Angebot direkt aus der Packliste eines Jobs erzeugt
-- wird, damit der Job seine Angebote anzeigen kann. Non-destruktiv; bestehende
-- Angebote bleiben unverknüpft (job_id = null).

alter table offers
  add column if not exists job_id uuid references jobs(id) on delete set null;

create index if not exists offers_job_id_idx on offers (job_id);

notify pgrst, 'reload schema';
