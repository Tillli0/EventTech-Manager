-- EventTech Manager — Storage Buckets

insert into storage.buckets (id, name, public)
values
  ('device-photos', 'device-photos', false),
  ('device-documents', 'device-documents', false)
on conflict (id) do nothing;

create policy "device_photos_authenticated_select"
  on storage.objects for select
  using (bucket_id = 'device-photos' and auth.role() = 'authenticated');

create policy "device_photos_authenticated_insert"
  on storage.objects for insert
  with check (bucket_id = 'device-photos' and auth.role() = 'authenticated');

create policy "device_photos_authenticated_delete"
  on storage.objects for delete
  using (bucket_id = 'device-photos' and auth.role() = 'authenticated');

create policy "device_documents_authenticated_select"
  on storage.objects for select
  using (bucket_id = 'device-documents' and auth.role() = 'authenticated');

create policy "device_documents_authenticated_insert"
  on storage.objects for insert
  with check (bucket_id = 'device-documents' and auth.role() = 'authenticated');

create policy "device_documents_authenticated_delete"
  on storage.objects for delete
  using (bucket_id = 'device-documents' and auth.role() = 'authenticated');
