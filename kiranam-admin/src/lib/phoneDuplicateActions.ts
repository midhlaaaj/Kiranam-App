'use server';

import { verifyAdmin } from '@/lib/dal';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PhoneDuplicateMatch {
  id: string;
  fullName: string | null;
  role: 'contributor' | 'volunteer' | 'admin';
}

// Checked on phone-field blur by RegisterContributorForm and
// RegisterVolunteerForm, before the rest of the form is even filled in —
// service-role client because ordinary admin RLS on profiles doesn't expose
// arbitrary phone lookups across all roles.
export async function checkPhoneDuplicate(dialCode: string, phoneDigits: string): Promise<PhoneDuplicateMatch | null> {
  await verifyAdmin();

  const digits = phoneDigits.replace(/\D/g, '');
  const code = dialCode.replace(/\D/g, '') || '91';
  if (!digits) return null;

  const phoneE164 = `+${code}${digits}`;
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .eq('phone', phoneE164)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, fullName: data.full_name, role: data.role };
}
