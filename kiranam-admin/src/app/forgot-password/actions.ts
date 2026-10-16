'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { passwordResetEmail } from '@/lib/email/templates';

export interface ForgotPasswordState {
  error?: string;
  message?: string;
}

// Same message whether or not the address has an account — never reveal
// which emails are registered.
const SENT_MESSAGE = 'If that email has an admin account, a reset link is on its way.';

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) {
    return { error: 'Enter your email.' };
  }

  // The reset link is minted here and sent through Resend rather than via
  // supabase.auth.resetPasswordForEmail: that path relies on Supabase's
  // built-in mailer (no custom SMTP is configured), which only delivers to
  // project team members and is rate-limited to a couple of emails an hour.
  const admin = createAdminClient();

  // Admin panel resets are for admins only — contributors log into the app
  // by phone OTP and have no password to reset.
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .eq('role', 'admin')
    .maybeSingle();
  if (!profile) return { message: SENT_MESSAGE };

  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error('requestPasswordReset: generateLink failed', error);
    return { message: SENT_MESSAGE };
  }

  // Deliberately lands on the MAIN admin domain's /reset-password, through
  // the auth subdomain's /auth/confirm — the same shape as the
  // reset-password.html Supabase template. /auth/confirm forwards the
  // session as access_token/refresh_token query params since this lands on
  // a different host than auth.kiranam.online. On localhost there is no
  // auth subdomain, so confirm on the same host.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const authBase =
    process.env.NEXT_PUBLIC_AUTH_SITE_URL ||
    (new URL(siteUrl).hostname === 'localhost' ? siteUrl : 'https://auth.kiranam.online');
  const resetUrl = new URL('/auth/confirm', authBase);
  resetUrl.searchParams.set('token_hash', tokenHash);
  resetUrl.searchParams.set('type', 'recovery');
  resetUrl.searchParams.set('next', `${siteUrl}/reset-password`);

  const { error: emailError } = await sendEmail({
    to: email,
    subject: 'Reset your Kiranam password',
    html: passwordResetEmail({ resetUrl: resetUrl.toString() }),
  });
  if (emailError) {
    return { error: "We couldn't send the reset email right now. Please try again in a few minutes." };
  }

  return { message: SENT_MESSAGE };
}
