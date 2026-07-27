'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  if (data.user && fullName) {
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id);
  }

  redirect('/login');
}
