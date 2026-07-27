'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';

export async function revokeAdmin(targetId: string) {
  const admin = await verifyAdmin();
  if (targetId === admin.id) throw new Error("You can't revoke your own admin access.");

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ role: 'contributor' }).eq('id', targetId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'revoke_admin', 'profiles', targetId);
  revalidatePath('/settings/admin-users');
}
