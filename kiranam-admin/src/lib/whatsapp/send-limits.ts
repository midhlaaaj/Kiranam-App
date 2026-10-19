import type { SupabaseClient } from '@supabase/supabase-js';

// Daily sending limits for broadcasts. Meta caps the number of *unique people*
// a business can message outside a customer-service window per rolling 24h
// (shared across the whole business portfolio). We keep our own configurable
// cap below that, plus a reserve for login OTPs / reminders / replies, which
// are sent outside broadcasts and so aren't counted here.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supabase = SupabaseClient<any, any, any>;

export interface SendLimits {
  /** Max unique people per rolling 24h. null = no cap. */
  cap: number | null;
  /** Headroom kept free for OTPs, reminders and replies. */
  reserve: number;
  autoResume: boolean;
  metaTier: string | null;
  metaCheckedAt: string | null;
}

const COUNTED_STATUSES = ['sent', 'delivered', 'read', 'replied'];
const PAGE = 1000;

/** `TIER_250` → 250, `TIER_2K` → 2000, `TIER_100K` → 100000, `TIER_UNLIMITED` → null. */
export function tierToLimit(tier: string | null | undefined): number | null {
  const m = /^TIER_(\d+)(K?)$/i.exec((tier ?? '').trim());
  if (!m) return null;
  return Number(m[1]) * (m[2] ? 1000 : 1);
}

export async function getSendLimits(supabase: Supabase, accountId: string): Promise<SendLimits | null> {
  const { data } = await supabase
    .from('whatsapp_config')
    .select('daily_send_cap, daily_reserve, auto_resume, meta_limit_tier, meta_limit_checked_at')
    .eq('account_id', accountId)
    .eq('status', 'connected')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    cap: data.daily_send_cap ?? null,
    reserve: data.daily_reserve ?? 0,
    autoResume: !!data.auto_resume,
    metaTier: data.meta_limit_tier ?? null,
    metaCheckedAt: data.meta_limit_checked_at ?? null,
  };
}

/** Contacts a broadcast message already reached in the last 24 hours. */
export async function recentlyMessagedContactIds(supabase: Supabase, accountId: string): Promise<Set<string>> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const ids = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('broadcast_recipients')
      .select('contact_id, broadcasts!inner(account_id)')
      .eq('broadcasts.account_id', accountId)
      .in('status', COUNTED_STATUSES)
      .gte('sent_at', since)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) ids.add((row as { contact_id: string }).contact_id);
    if (!data || data.length < PAGE) return ids;
  }
}

/**
 * Distinct people sent a login code in the last 24 hours (see migration 038).
 * 0 when the counter isn't available, so sending never breaks over it.
 */
export async function getOtpRecipientsLast24h(supabase: Supabase): Promise<number> {
  const { data, error } = await supabase.rpc('otp_recipients_last_24h');
  return error || typeof data !== 'number' ? 0 : data;
}

/** The reserve actually held back: the configured one, or more if login codes already used more. */
export function effectiveReserve(limits: SendLimits, otpRecipients: number): number {
  return Math.max(limits.reserve, otpRecipients);
}

/** How many NEW people a broadcast may still reach right now (null = unlimited). */
export function remainingAllowance(
  limits: SendLimits | null,
  alreadyMessaged: Set<string>,
  otpRecipients = 0
): number | null {
  if (!limits || limits.cap === null) return null;
  return Math.max(0, limits.cap - effectiveReserve(limits, otpRecipients) - alreadyMessaged.size);
}

/**
 * Splits recipients into "send now" and "wait". People already messaged in the
 * last 24h don't use up more allowance (Meta counts unique people), and
 * recipients without a contact are passed through so they get marked failed.
 */
export function planSend<T extends { contact: { id: string } | null }>(
  recipients: T[],
  alreadyMessaged: Set<string>,
  allowance: number | null
): { now: T[]; later: T[] } {
  if (allowance === null) return { now: recipients, later: [] };
  const now: T[] = [];
  const later: T[] = [];
  let budget = allowance;
  for (const r of recipients) {
    const id = r.contact?.id;
    if (!id || alreadyMessaged.has(id)) now.push(r);
    else if (budget > 0) {
      now.push(r);
      budget--;
    } else later.push(r);
  }
  return { now, later };
}
