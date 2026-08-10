'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email/resend';
import { adminInviteEmail } from '@/lib/email/templates';

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

  // Best-effort: the invite row is already created and usable (someone who
  // already knows to go to /signup can claim it regardless), so a failed
  // send here shouldn't roll back the invite itself — just log it.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { error: emailError } = await sendEmail({
    to: email,
    subject: "You've been invited to manage Kiranam",
    html: adminInviteEmail({ signupUrl: `${siteUrl}/signup`, invitedEmail: email }),
  });
  if (emailError) {
    console.error('Failed to send admin invite email:', emailError);
  }

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
