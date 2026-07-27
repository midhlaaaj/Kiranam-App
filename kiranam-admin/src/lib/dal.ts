import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface AdminProfile {
  id: string;
  full_name: string;
  email: string | null;
}

// Verifies the caller is signed in AND has role='admin' in `profiles`.
// Redirects to /login otherwise. Cached per-request so calling it from
// multiple Server Components/Actions doesn't re-hit the database.
export const verifyAdmin = cache(async (): Promise<AdminProfile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/login?error=not_admin');
  }

  return { id: profile.id, full_name: profile.full_name, email: profile.email };
});
