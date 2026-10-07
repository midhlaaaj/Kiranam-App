'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';
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
  /** Invite was saved but the email didn't go out — the admin needs to share
   * `signupUrl` themselves. */
  warning?: string;
  signupUrl?: string;
}

export async function createInvite(_prevState: InviteState, formData: FormData): Promise<InviteState> {
  const admin = await verifyAdmin();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) return { error: 'Email is required.' };
  return issueInvite(admin.id, email);
}

/** Row action on the Team page's pending-invites list — same refresh-in-place
 * path as re-submitting the email in the invite form. */
export async function resendInvite(inviteId: string): Promise<InviteState> {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { data: invite } = await supabase.from('admin_invites').select('email').eq('id', inviteId).maybeSingle();
  if (!invite) return { error: 'That invite no longer exists.' };
  return issueInvite(admin.id, invite.email);
}

async function issueInvite(adminId: string, email: string): Promise<InviteState> {

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
      .update({ invited_by: adminId, expires_at: expiresAt.toISOString(), created_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { error: friendlyErrorMessage(error.message) };
    inviteId = existing.id;
  } else {
    const { data, error } = await supabase
      .from('admin_invites')
      .insert({ email, invited_by: adminId, expires_at: expiresAt.toISOString() })
      .select('id')
      .single();
    if (error) return { error: friendlyErrorMessage(error.message) };
    inviteId = data.id;
  }

  await logAction(adminId, 'invite_admin', 'admin_invites', inviteId, { email, label: email });

  // Best-effort: the invite row is already created/refreshed and usable
  // (anyone who signs up at /signup with this email claims it), so a failed
  // send doesn't roll the invite back — but the admin is told, and handed
  // the link to share directly, instead of a false "sent".
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const signupUrl = `${siteUrl}/signup`;
  const { error: emailError } = await sendEmail({
    to: email,
    subject: "You've been invited to manage Kiranam",
    html: adminInviteEmail({ signupUrl, invitedEmail: email, expiresAt }),
  });

  revalidatePath('/settings/admin-users');
  if (emailError) {
    console.error('Failed to send admin invite email:', emailError);
    return {
      warning: `Invite created for ${email}, but the email couldn't be sent. Share the sign-up link with them directly — they must sign up with this exact email within ${ADMIN_INVITE_EXPIRY_DAYS} days.`,
      signupUrl,
    };
  }
  return { message: `Invite emailed to ${email} — it expires in ${ADMIN_INVITE_EXPIRY_DAYS} days.` };
}

export async function revokeInvite(inviteId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { data: invite } = await supabase.from('admin_invites').select('email').eq('id', inviteId).maybeSingle();
  const { error } = await supabase.from('admin_invites').delete().eq('id', inviteId);
  if (error) throw new Error(friendlyErrorMessage(error.message));

  await logAction(admin.id, 'revoke_invite', 'admin_invites', inviteId, { label: invite?.email ?? null });
  revalidatePath('/settings/admin-users');
}

export async function setAutoAssignKkNumber(enabled: boolean) {
  const admin = await verifyAdmin();
  // app_settings has no client-facing RLS policies (service-role only, see
  // 020_razorpay_recurring_autopay.sql) — same reason registerContributor
  // reads it via the admin client rather than the session client.
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({ key: 'auto_assign_kk_number', value: String(enabled), updated_at: new Date().toISOString() });
  if (error) throw new Error(friendlyErrorMessage(error.message));

  await logAction(admin.id, 'set_auto_assign_kk_number', 'app_settings', 'app_settings', { enabled });
  revalidatePath('/settings');
  revalidatePath('/contributors');
}

export interface MissingKkContributor {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export interface KkCoverageState {
  message?: string;
  error?: string;
  missing?: MissingKkContributor[];
  total?: number;
}

// Report-only: lists contributors missing a KK number so an admin can see
// (and immediately backfill) how much manual work is left before flipping
// auto-assign on. Doesn't assign anything itself — see assignKkNumber in
// contributors/actions.ts for that.
export async function checkKkNumberCoverage(): Promise<KkCoverageState> {
  await verifyAdmin();
  const supabase = await createClient();

  const { count: total, error: totalError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'contributor');
  if (totalError) return { error: totalError.message };

  const { data: missing, error: missingError } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'contributor')
    .is('kk_number', null)
    .order('full_name', { ascending: true });
  if (missingError) return { error: missingError.message };

  if (!missing || missing.length === 0) {
    return { message: `All ${total ?? 0} contributors have a KK number assigned.`, missing: [], total: total ?? 0 };
  }
  return {
    message: `${missing.length} of ${total ?? 0} contributors are missing a KK number.`,
    missing,
    total: total ?? 0,
  };
}
