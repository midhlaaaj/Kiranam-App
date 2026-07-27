import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Service-role client — bypasses Row Level Security entirely.
 * Server-only. Used for operations no ordinary admin session can do:
 * creating an auth.users row directly (manual contributor registration)
 * and minting a session-bridge link into wacrm. Never import this from
 * a Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser. */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
