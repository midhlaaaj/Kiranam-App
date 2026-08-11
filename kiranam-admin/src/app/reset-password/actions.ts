'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface ResetPasswordState {
  error?: string;
}

// Called once on page load when /auth/confirm forwarded a session as
// access_token/refresh_token query params (this page lives on a different
// host than auth.kiranam.online, where those tokens' cookies were set — see
// /auth/confirm/route.ts). setSession() here runs inside a Server Action,
// which — unlike a Server Component render — is allowed to write cookies,
// so this is what actually persists the session for updatePassword below.
export async function establishResetSession(
  accessToken: string,
  refreshToken: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return error ? { error: error.message } : {};
}

export async function updatePassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const supabase = await createClient();

  // Only reachable with a valid session — established either directly by
  // /auth/confirm (same-host redirect) or by establishResetSession above
  // (forwarded tokens, cross-host redirect) before this form ever renders.
  // No session means the link was invalid/expired rather than a real
  // "wrong password" case.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'This reset link has expired. Request a new one from the login page.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect('/login?reset=success');
}
