'use server';

import { createClient } from '@/lib/supabase/server';

export interface ForgotPasswordState {
  error?: string;
  message?: string;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') || '').trim();
  if (!email) {
    return { error: 'Enter your email.' };
  }

  const supabase = await createClient();
  // Deliberately the MAIN domain, not auth.kiranam.online — this is an
  // admin resetting their own password, so landing on the admin domain is
  // expected and correct. The auth subdomain is proxy-restricted to
  // /auth/* only (see proxy.ts), which would reject the /reset-password
  // landing page this flow needs.
  //
  // A plain destination, not another /auth/confirm URL — the email
  // template (reset-password.html) already wraps this value in its own
  // next={{ .RedirectTo }} on the outer auth.kiranam.online link, so
  // nesting a second /auth/confirm here would produce a URL with no
  // token_hash/type on the inner hop and dead-end at /auth/error.
  // /auth/confirm forwards the session as access_token/refresh_token query
  // params since this lands on a different host than auth.kiranam.online.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  // Same message whether or not the address has an account — never reveal
  // which emails are registered.
  return { message: 'If that email has an admin account, a reset link is on its way.' };
}
