import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface Recipient {
  id: string;
  name: string;
  phone: string | null;
  /** Set only when the user confirmed this address (auth email_confirmed_at)
   * and it's the one on their profile — the same rule the app's
   * isEmailVerified uses before emailing receipts. */
  verifiedEmail: string | null;
  /** Contributor paused contributions — they've opted out of WhatsApp
   * broadcasts (see 021_contribution_pause.sql). */
  paused: boolean;
}

const PAGE = 1000;

/** Confirmed emails keyed by user id, from auth.users. */
async function confirmedEmails(ids?: Set<string>): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const result = new Map<string, string>();

  // A handful of known users: look each one up instead of paging everyone.
  if (ids && ids.size <= 20) {
    await Promise.all(
      [...ids].map(async (id) => {
        const { data } = await supabase.auth.admin.getUserById(id);
        const u = data?.user;
        if (u?.email && u.email_confirmed_at) result.set(u.id, u.email.toLowerCase());
      }),
    );
    return result;
  }

  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    for (const u of data.users) {
      if (u.email && u.email_confirmed_at && (!ids || ids.has(u.id))) result.set(u.id, u.email.toLowerCase());
    }
    if (data.users.length < PAGE) break;
  }
  return result;
}

async function pausedIds(): Promise<Set<string>> {
  const { data, error } = await createAdminClient()
    .from('commitments')
    .select('contributor_id')
    .eq('contribution_paused', true);
  if (error) throw new Error(`Could not load paused contributors: ${error.message}`);
  return new Set((data ?? []).map((c) => c.contributor_id as string));
}

/** Profiles → Recipients, attaching each one's verified email (if any). */
async function withVerifiedEmails(
  profiles: { id: string; full_name: string | null; phone: string | null; email: string | null }[],
  ids?: Set<string>,
): Promise<Recipient[]> {
  const [emails, paused] = await Promise.all([confirmedEmails(ids), pausedIds()]);
  return profiles.map((p) => {
    const confirmed = emails.get(p.id);
    return {
      id: p.id,
      name: p.full_name?.trim() || 'there',
      phone: p.phone,
      verifiedEmail: confirmed && p.email && confirmed === p.email.toLowerCase() ? confirmed : null,
      paused: paused.has(p.id),
    };
  });
}

/** Every contributor and coordinator. */
export async function listCommunityRecipients(): Promise<Recipient[]> {
  const supabase = createAdminClient();
  const profiles: { id: string; full_name: string | null; phone: string | null; email: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .in('role', ['contributor', 'volunteer'])
      // Email-only accounts (revoked admins) aren't community members.
      .not('phone', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Could not load recipients: ${error.message}`);
    profiles.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return withVerifiedEmails(profiles);
}

/** Specific users by profile id. */
export async function getRecipients(ids: string[]): Promise<Recipient[]> {
  if (ids.length === 0) return [];
  const supabase = createAdminClient();
  const profiles: { id: string; full_name: string | null; phone: string | null; email: string | null }[] = [];
  // Chunked so a long id list doesn't overflow the request URL.
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .in('id', ids.slice(i, i + 200));
    if (error) throw new Error(`Could not load recipients: ${error.message}`);
    profiles.push(...(data ?? []));
  }
  return withVerifiedEmails(profiles, new Set(ids));
}
