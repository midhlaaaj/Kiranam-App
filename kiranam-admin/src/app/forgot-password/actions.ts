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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });

  // Same message whether or not the address has an account — never reveal
  // which emails are registered.
  return { message: 'If that email has an admin account, a reset link is on its way.' };
}
