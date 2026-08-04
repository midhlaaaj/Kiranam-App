'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface LoginState {
  error?: string;
}

interface RateLimitCheck {
  allowed: boolean;
  retry_after_seconds: number;
}

// Keyed on both email and IP: email-keyed stops someone hammering one
// specific admin account; IP-keyed stops someone trying many different
// email guesses from one source. Both must pass.
const EMAIL_LIMIT = { limit: 5, windowSeconds: 15 * 60, lockoutSeconds: 15 * 60 };
const IP_LIMIT = { limit: 20, windowSeconds: 15 * 60, lockoutSeconds: 15 * 60 };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = h.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

function lockoutMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const ip = await getClientIp();
  const admin = createAdminClient();

  // Check both limiters BEFORE attempting Supabase auth at all — this also
  // avoids leaking account-existence via response timing.
  const { data: emailCheck } = await admin.rpc('check_and_record_rate_limit', {
    p_key: `admin_login:email:${email.toLowerCase()}`,
    p_limit: EMAIL_LIMIT.limit,
    p_window_seconds: EMAIL_LIMIT.windowSeconds,
    p_lockout_seconds: EMAIL_LIMIT.lockoutSeconds,
  }).single<RateLimitCheck>();
  if (emailCheck && !emailCheck.allowed) {
    return { error: lockoutMessage(emailCheck.retry_after_seconds) };
  }

  const { data: ipCheck } = await admin.rpc('check_and_record_rate_limit', {
    p_key: `admin_login:ip:${ip}`,
    p_limit: IP_LIMIT.limit,
    p_window_seconds: IP_LIMIT.windowSeconds,
    p_lockout_seconds: IP_LIMIT.lockoutSeconds,
  }).single<RateLimitCheck>();
  if (ipCheck && !ipCheck.allowed) {
    return { error: lockoutMessage(ipCheck.retry_after_seconds) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut();
    return { error: 'This account does not have admin access.' };
  }

  // Successful, verified admin login — clear both counters so a legitimate
  // user isn't left mid-lockout from earlier mistyped attempts.
  await admin.rpc('reset_rate_limit', { p_key: `admin_login:email:${email.toLowerCase()}` });
  await admin.rpc('reset_rate_limit', { p_key: `admin_login:ip:${ip}` });

  redirect('/');
}
