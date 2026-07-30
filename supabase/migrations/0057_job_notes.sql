-- 0057: Gesprächsverlauf am Job (PLAN-EVENT-PLANUNG.md P6).
--
-- Design-Entscheidungen:
-- * `jobs.notes` bleibt die Kopfnotiz (ein Feld, wird beim Bearbeiten überschrieben).
--   `job_notes` ist der Verlauf daneben: mehrere datierte Einträge mit Verfasser,
--   z.B. "15.08. Kunde ruft an: Bühne soll doch nach links" — genau das, was eine
--   einzelne Notiz nicht abbilden kann, ohne alte Stände zu überschreiben.
-- * `author_id default auth.uid()` (Muster jobs.created_by aus 0012/0016) — der
--   Verfasser ist immer, wer den Eintrag angelegt hat, nicht wählbar.
-- * Bewusst KEIN Update auf den Text: ein Gesprächsverlauf ist ein Protokoll, kein
--   Dokument — falsche Einträge werden gelöscht, nicht nachträglich umgeschrieben
--   (sonst verliert "wer hat wann was gesagt" seine Beweiskraft). Löschen bleibt
--   möglich (Tippfehler, Dubletten).
-- * RLS Bereich 'jobs', `can_see_job(job_id)` beim Lesen (Muster job_retrospectives
--   0048) — ein Gesprächsverlauf ist Job-Wissen, kein kaufmännisches Geheimnis.

create table job_notes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null default auth.uid(),
  body text not null constraint chk_job_notes_body check (body <> ''),
  created_at timestamptz not null default now()
);

create index idx_job_notes_job on job_notes(job_id);

-- ============================================================
-- RLS (Bereich 'jobs', Sichtbarkeit an den Job gekoppelt — Muster job_retrospectives 0048).
-- ============================================================

alter table job_notes enable row level security;

create policy job_notes_sel on job_notes for select using (can_see_job(job_id));
create policy job_notes_ins on job_notes for insert with check (can_edit_area('jobs'));
create policy job_notes_del on job_notes for delete using (can_edit_area('jobs'));

-- Kein Auto-Expose: explizite GRANTs (anon bekommt nichts, siehe 0030). Bewusst
-- kein UPDATE-Grant (siehe Kommentar oben: kein Nachschreiben des Protokolls).
grant select, insert, delete on job_notes to authenticated;
grant all on job_notes to service_role;

notify pgrst, 'reload schema';
