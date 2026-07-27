-- Aadhaar verification was dropped from volunteer onboarding — remove the
-- column, its storage bucket, and the bucket's RLS policies.

drop policy if exists "aadhaar_owner_or_admin_read" on storage.objects;
drop policy if exists "aadhaar_owner_upload" on storage.objects;

delete from storage.objects where bucket_id = 'aadhaar-documents';
delete from storage.buckets where id = 'aadhaar-documents';

alter table public.volunteer_applications drop column if exists aadhaar_url;
