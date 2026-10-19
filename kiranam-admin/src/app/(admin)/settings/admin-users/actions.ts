'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction, lookupLabel } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';

export async function revokeAdmin(targetId: string) {
  const admin = await verifyAdmin();
  if (targetId === admin.id) throw new Error("You can't revoke your own admin access.");

  const supabase = await createClient();
  const label = await lookupLabel('profiles', targetId);
  const { data: target } = await supabase.from('profiles').select('phone').eq('id', targetId).maybeSingle();
  const { error } = await supabase.from('profiles').update({ role: 'contributor' }).eq('id', targetId);
  if (error) throw new Error(friendlyErrorMessage(error.message));

  // Admins sign in with email + password and have no phone number, so as a
  // plain "contributor" this account could never be used for anything — turn
  // the login off so the old password stops working (role checks already
  // lock them out of the panel immediately). Re-inviting them switches it
  // back on at sign-up. Someone with a phone number is also a real app user
  // (phone OTP login), so they're left able to sign in.
  if (!target?.phone) {
    const { error: banError } = await createAdminClient().auth.admin.updateUserById(targetId, {
      ban_duration: '876000h', // ~100 years; lifted on re-invite
    });
    if (banError) console.error('revokeAdmin: could not disable login', banError);
  }

  await logAction(admin.id, 'revoke_admin', 'profiles', targetId, { label });
  revalidatePath('/settings/admin-users');
}
