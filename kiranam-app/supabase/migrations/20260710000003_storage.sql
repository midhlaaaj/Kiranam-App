-- Storage buckets for Kiranam
-- Uploaded file paths are expected to be prefixed with the owner's user id,
-- e.g. `${user.id}/aadhaar.jpg`, so the folder-based ownership check below works.

insert into storage.buckets (id, name, public)
values
  ('aadhaar-documents', 'aadhaar-documents', false),
  ('campaign-images', 'campaign-images', true),
  ('event-images', 'event-images', true)
on conflict (id) do nothing;

create policy "aadhaar_owner_or_admin_read" on storage.objects for select
  using (
    bucket_id = 'aadhaar-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "aadhaar_owner_upload" on storage.objects for insert
  with check (
    bucket_id = 'aadhaar-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "campaign_images_public_read" on storage.objects for select
  using (bucket_id = 'campaign-images');

create policy "campaign_images_admin_write" on storage.objects for insert
  with check (bucket_id = 'campaign-images' and public.is_admin());

create policy "event_images_public_read" on storage.objects for select
  using (bucket_id = 'event-images');

create policy "event_images_admin_write" on storage.objects for insert
  with check (bucket_id = 'event-images' and public.is_admin());
