'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email/resend';
import { adminInviteEmail } from '@/lib/email/templates';

// Must match the `expires_at` default set by the admin_invite_expiry
// migration, and is what enforces the deadline server-side (is_email_invited
// / promote_if_invited both check expires_at > now()) — this constant only
// controls what gets written on each new/resent invite and what the email
// tells the recipient.
const ADMIN_INVITE_EXPIRY_DAYS = 7;

export interface InviteState {
  message?: string;
  error?: string;
}

export async function createInvite(_prevState: InviteState, formData: FormData): Promise<InviteState> {
  const admin = await verifyAdmin();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) return { error: 'Email is required.' };

  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + ADMIN_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // `email` is UNIQUE on admin_invites, so a plain insert fails outright on
  // re-invite — including the common case of resending to someone whose
  // invite expired before they acted on it. Look up any existing row first:
  // a *used* one means they already have an account (re-inviting makes no
  // sense and must not reset used_at); anything else (never used — pending
  // or expired) gets its invited_by/expires_at refreshed in place, which is
  // how "resend" works — just submit the same email again.
  const { data: existing } = await supabase
    .from('admin_invites')
    .select('id, used_at')
    .eq('email', email)
    .maybeSingle();

  if (existing?.used_at) {
    return { error: 'This email already has an admin account.' };
  }

  let inviteId: string;
  if (existing) {
    const { error } = await supabase
      .from('admin_invites')
      .update({ invited_by: admin.id, expires_at: expiresAt.toISOString(), created_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { error: error.message };
    inviteId = existing.id;
  } else {
    const { data, error } = await supabase
      .from('admin_invites')
      .insert({ email, invited_by: admin.id, expires_at: expiresAt.toISOString() })
      .select('id')
      .single();
    if (error) return { error: error.message };
    inviteId = data.id;
  }

  await logAction(admin.id, 'invite_admin', 'admin_invites', inviteId, { email });

  // Best-effort: the invite row is already created/refreshed and usable
  // (someone who already knows to go to /signup can claim it regardless),
  // so a failed send here shouldn't roll back the invite itself — just log
  // it, and the admin can retry by re-submitting the same email.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { error: emailError } = await sendEmail({
    to: email,
    subject: "You've been invited to manage Kiranam",
    html: adminInviteEmail({ signupUrl: `${siteUrl}/signup`, invitedEmail: email, expiresAt }),
  });
  if (emailError) {
    console.error('Failed to send admin invite email:', emailError);
  }

  revalidatePath('/settings');
  return { message: `Invite sent to ${email} — expires in ${ADMIN_INVITE_EXPIRY_DAYS} days.` };
}

export async function revokeInvite(inviteId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('admin_invites').delete().eq('id', inviteId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'revoke_invite', 'admin_invites', inviteId);
  revalidatePath('/settings');
}
