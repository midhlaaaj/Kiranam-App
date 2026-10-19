import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/** A fresh secret for an invite link, and the hash that gets stored. */
export function newInviteToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** The invite a link's token belongs to — only if it's unused and not
 * expired. This (not a typed email address) is what authorises sign-up. */
export async function findValidInvite(token: string | null | undefined) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const { data } = await createAdminClient()
    .from('admin_invites')
    .select('id, email')
    .eq('token_hash', hashToken(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return data as { id: string; email: string } | null;
}
