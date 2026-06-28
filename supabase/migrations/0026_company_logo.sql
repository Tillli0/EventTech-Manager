-- 0026: Firmenlogo für die Angebots-PDFs. Speichert den Storage-Pfad in
-- company_settings und legt einen öffentlichen Bucket an, damit der PDF-Renderer
-- das Bild ohne Auth-Header laden kann (analog zu device-photos).

alter table company_settings add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

-- Lesen für alle (public Bucket / PDF-Erzeugung), Schreiben für Eingeloggte.
-- Admin-Gating passiert zusätzlich in der UI.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'company_assets_public_select') then
    create policy "company_assets_public_select" on storage.objects for select
      using (bucket_id = 'company-assets');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'company_assets_authenticated_insert') then
    create policy "company_assets_authenticated_insert" on storage.objects for insert
      with check (bucket_id = 'company-assets' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'company_assets_authenticated_update') then
    create policy "company_assets_authenticated_update" on storage.objects for update
      using (bucket_id = 'company-assets' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'company_assets_authenticated_delete') then
    create policy "company_assets_authenticated_delete" on storage.objects for delete
      using (bucket_id = 'company-assets' and auth.role() = 'authenticated');
  end if;
end $$;

notify pgrst, 'reload schema';
