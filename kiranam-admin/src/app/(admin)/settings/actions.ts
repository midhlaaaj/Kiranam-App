'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';

export async function createInvite(formData: FormData) {
  const admin = await verifyAdmin();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_invites')
    .insert({ email, invited_by: admin.id })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'invite_admin', 'admin_invites', data.id, { email });
  revalidatePath('/settings');
}

export async function revokeInvite(inviteId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('admin_invites').delete().eq('id', inviteId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'revoke_invite', 'admin_invites', inviteId);
  revalidatePath('/settings');
}
