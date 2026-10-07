import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { uploadPublicImage } from '@/lib/storage';

type MediaTarget =
  | { table: 'campaigns'; imageTable: 'campaign_images'; fk: 'campaign_id'; bucket: 'campaign-images' }
  | { table: 'events'; imageTable: 'event_images'; fk: 'event_id'; bucket: 'event-images' };

export const CAMPAIGN_MEDIA: MediaTarget = { table: 'campaigns', imageTable: 'campaign_images', fk: 'campaign_id', bucket: 'campaign-images' };
export const EVENT_MEDIA: MediaTarget = { table: 'events', imageTable: 'event_images', fk: 'event_id', bucket: 'event-images' };

/**
 * Applies MediaManager's submission to a record. `media_order` lists the final
 * photos in order — saved ones by URL ("u:…"), new ones by index into
 * `media_files` ("n:0"). The first becomes the cover; the rest become the
 * gallery in that order. Photos not in the list are removed.
 *
 * Returns false (and changes nothing) when the form had no media fields, so
 * callers that don't render MediaManager are unaffected.
 */
export async function applyMediaFromForm(target: MediaTarget, recordId: string, formData: FormData): Promise<boolean> {
  const raw = formData.get('media_order');
  if (typeof raw !== 'string') return false;

  let tokens: string[];
  try {
    tokens = JSON.parse(raw);
    if (!Array.isArray(tokens)) return false;
  } catch {
    return false;
  }

  const files = formData.getAll('media_files').filter((f): f is File => f instanceof File && f.size > 0);

  // Upload new photos first so a failed upload leaves the record untouched.
  const urls: string[] = [];
  for (const token of tokens) {
    if (token.startsWith('u:')) urls.push(token.slice(2));
    else if (token.startsWith('n:')) {
      const file = files[Number(token.slice(2))];
      if (file) urls.push(await uploadPublicImage(target.bucket, recordId, file));
    }
  }

  const supabase = await createClient();
  const [cover, ...gallery] = urls;
  const { error: coverError } = await supabase
    .from(target.table)
    .update({ cover_image_url: cover ?? null })
    .eq('id', recordId);
  if (coverError) throw new Error(coverError.message);

  // The app orders the gallery by created_at, so rewrite the rows with
  // explicit, increasing timestamps (and sort_order) in the chosen order.
  const { error: delError } = await supabase.from(target.imageTable).delete().eq(target.fk, recordId);
  if (delError) throw new Error(delError.message);
  if (gallery.length > 0) {
    const base = Date.now();
    const rows = gallery.map((image_url, i) => ({
      [target.fk]: recordId,
      image_url,
      sort_order: i,
      created_at: new Date(base + i * 1000).toISOString(),
    }));
    const { error: insError } = await supabase.from(target.imageTable).insert(rows);
    if (insError) throw new Error(insError.message);
  }
  return true;
}
