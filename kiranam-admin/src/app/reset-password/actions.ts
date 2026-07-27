'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface ResetPasswordState {
  error?: string;
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

  // Only reachable with a valid session — /auth/confirm establishes one
  // from the emailed reset link before redirecting here. No session means
  // the link was invalid/expired rather than a real "wrong password" case.
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
