'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';

export type Audience = 'contributor' | 'volunteer' | 'all';

export interface SendState {
  message?: string;
  error?: string;
  /** Recipients whose push failed — offered back as "Retry failed only". */
  failedIds?: string[];
  /** Echoed back so React's post-action form reset doesn't wipe the draft
   * when the send didn't (fully) go through. */
  values?: { title: string; body: string; audience: Audience };
}

const BATCH_SIZE = 20;

export async function sendAnnouncement(_prevState: SendState, formData: FormData): Promise<SendState> {
  const admin = await verifyAdmin();
  const title = String(formData.get('title') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const rawAudience = formData.get('audience');
  const audience: Audience = rawAudience === 'volunteer' || rawAudience === 'all' ? rawAudience : 'contributor';
  const retryIds = String(formData.get('retryIds') || '')
    .split(',')
    .filter(Boolean);
  const values = { title, body, audience };

  if (!title || !body) return { error: 'Add a title and a message.', values };

  const supabase = await createClient();
  let ids = retryIds;
  if (ids.length === 0) {
    const roles = audience === 'all' ? ['contributor', 'volunteer'] : [audience];
    const { data: recipients, error } = await supabase.from('profiles').select('id').in('role', roles);
    if (error) return { error: 'Couldn’t load the recipient list. Nothing was sent.', values };
    ids = (recipients || []).map((r) => r.id);
  }
  if (ids.length === 0) return { error: 'There is nobody to send to yet.', values };

  // notify() (not a plain bulk insert) so each recipient also gets a push via
  // the shared send-push-notification Edge Function. Sent in small batches,
  // and every outcome is counted — a single failure must not be reported as
  // "nothing sent" when most people already received it.
  const failedIds: string[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((profileId) =>
        supabase.rpc('notify', { p_profile_id: profileId, p_title: title, p_body: body, p_category: 'broadcast' })
      )
    );
    results.forEach((r, j) => {
      if (r.status === 'rejected' || r.value.error) failedIds.push(batch[j]);
    });
  }

  const sent = ids.length - failedIds.length;
  const noun = (n: number) => (audience === 'all' ? (n === 1 ? 'person' : 'people') : `${audience}${n === 1 ? '' : 's'}`);

  if (sent > 0) {
    await logAction(admin.id, 'send_announcement', 'notifications', undefined, {
      audience,
      count: sent,
      failed: failedIds.length,
      title,
      body,
      retry: retryIds.length > 0,
    });
    revalidatePath('/notifications');
  }

  if (failedIds.length === 0) {
    return { message: `Sent “${title}” to ${sent} ${noun(sent)}.` };
  }
  if (sent === 0) {
    return { error: `Couldn’t send to any of the ${ids.length} ${noun(ids.length)}. Nothing was delivered — try again.`, failedIds, values };
  }
  return {
    error: `Sent to ${sent} of ${ids.length} ${noun(ids.length)}. ${failedIds.length} failed — retry just those, so nobody gets it twice.`,
    failedIds,
    values,
  };
}
