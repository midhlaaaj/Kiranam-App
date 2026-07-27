import 'server-only';
import { createClient } from '@/lib/supabase/server';

function extensionOf(file: File) {
  const fromName = file.name?.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type?.split('/').pop() || 'jpg';
}

// Uploads to a public bucket and returns its public URL. Used for
// campaign/event cover + gallery images (both buckets are public-read,
// admin-write per the Phase 1 storage migration).
export async function uploadPublicImage(bucket: string, folder: string, file: File) {
  const supabase = await createClient();
  const path = `${folder}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${extensionOf(file)}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
