'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SignupState {
  error?: string;
}

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('fullName') || '').trim();

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const supabase = await createClient();

  const { data: invited } = await supabase.rpc('is_email_invited', { p_email: email });
  if (!invited) {
    return { error: "This email hasn't been invited as an admin." };
  }

  // Invited admins are trusted (the invite itself is the verification
  // step), so create the user pre-confirmed rather than sending a
  // confirmation email via the normal signUp flow.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return { error: error.message };

  if (data.user && fullName) {
    await admin.from('profiles').update({ full_name: fullName }).eq('id', data.user.id);
  }

  redirect('/login');
}
