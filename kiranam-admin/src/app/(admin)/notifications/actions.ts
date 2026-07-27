'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';

export interface SendState {
  message?: string;
  error?: string;
}

export async function sendAnnouncement(_prevState: SendState, formData: FormData): Promise<SendState> {
  const admin = await verifyAdmin();
  const title = String(formData.get('title') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const audience = String(formData.get('audience') || 'contributor');

  if (!title || !body) {
    return { error: 'Title and message are required.' };
  }

  const supabase = await createClient();
  const { data: recipients } = await supabase.from('profiles').select('id').eq('role', audience);
  const ids = (recipients || []).map((r) => r.id);

  if (ids.length === 0) {
    return { error: 'No matching recipients found.' };
  }

  const { error } = await supabase.from('notifications').insert(
    ids.map((profileId) => ({
      profile_id: profileId,
      title,
      body,
      category: 'system' as const,
    }))
  );
  if (error) return { error: error.message };

  await logAction(admin.id, 'send_announcement', 'notifications', undefined, { audience, count: ids.length, title });
  revalidatePath('/notifications');
  return { message: `Sent to ${ids.length} ${audience}${ids.length === 1 ? '' : 's'}.` };
}
