'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction, lookupLabel } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';

export async function revokeAdmin(targetId: string) {
  const admin = await verifyAdmin();
  if (targetId === admin.id) throw new Error("You can't revoke your own admin access.");

  const supabase = await createClient();
  const label = await lookupLabel('profiles', targetId);
  const { error } = await supabase.from('profiles').update({ role: 'contributor' }).eq('id', targetId);
  if (error) throw new Error(friendlyErrorMessage(error.message));

  await logAction(admin.id, 'revoke_admin', 'profiles', targetId, { label });
  revalidatePath('/settings/admin-users');
}
