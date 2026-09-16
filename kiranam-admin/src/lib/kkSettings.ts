import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// app_settings has no client-facing RLS policies (service-role only, see
// 020_razorpay_recurring_autopay.sql), so reading it always goes through the
// admin client rather than the caller's session client.
export async function getAutoAssignKkNumber(): Promise<boolean> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'auto_assign_kk_number')
    .maybeSingle();
  return data?.value === 'true';
}
