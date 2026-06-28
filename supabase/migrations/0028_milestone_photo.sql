-- 0028: Foto an einem Zeitplan-Programmpunkt (z.B. Bühnenplan, Stellprobe-Foto).
-- Speichert den Storage-Pfad; öffentlicher Bucket, damit das Bild ohne Auth-Header
-- angezeigt werden kann (analog device-photos / company-assets).

alter table job_milestones add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'job_photos_public_select') then
    create policy "job_photos_public_select" on storage.objects for select
      using (bucket_id = 'job-photos');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'job_photos_authenticated_insert') then
    create policy "job_photos_authenticated_insert" on storage.objects for insert
      with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'job_photos_authenticated_delete') then
    create policy "job_photos_authenticated_delete" on storage.objects for delete
      using (bucket_id = 'job-photos' and auth.role() = 'authenticated');
  end if;
end $$;

notify pgrst, 'reload schema';
