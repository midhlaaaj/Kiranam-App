import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentKkHighWater, type KkSeries } from '@/lib/kk';

// app_settings has no client-facing RLS policies (service-role only, see
// 020_razorpay_recurring_autopay.sql), so reading it always goes through the
// admin client rather than the caller's session client.
// KK (Indian numbers) and KKG (non-Indian numbers) each have their own switch.
// The KK switch keeps the original key from before KKG existed.
export const AUTO_ASSIGN_KEY: Record<KkSeries, string> = {
  KK: 'auto_assign_kk_number',
  KKG: 'auto_assign_kkg_number',
};

export async function getAutoAssign(series: KkSeries): Promise<boolean> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', AUTO_ASSIGN_KEY[series])
    .maybeSingle();
  return data?.value === 'true';
}

export async function getAutoAssignSettings(): Promise<Record<KkSeries, boolean>> {
  const [KK, KKG] = await Promise.all([getAutoAssign('KK'), getAutoAssign('KKG')]);
  return { KK, KKG };
}

/** The profile already holding this KK / KKG number (case-insensitive — the
 * database's unique index ignores case), or null when it's free. */
export async function findKkNumberOwner(kkNumber: string): Promise<{ id: string; full_name: string | null } | null> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .ilike('kk_number', kkNumber.trim())
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Shown wherever a KK number turns out to be taken. */
export function kkInUseMessage(kkNumber: string, ownerName?: string | null): string {
  return `${kkNumber} is already in use${ownerName ? ` by ${ownerName}` : ''}. Use something else.`;
}

// Highest number in use in a series (KK or KKG); each series counts on its
// own. profiles.kk_number is a free-form string (not a DB sequence), so this
// reads the numeric suffixes directly. It pages through every row — the API
// returns at most 1000 per request, and with more KK numbers than that a single
// read would miss some — and continues from the real run of numbers, ignoring
// stray outliers (see currentKkHighWater).
async function kkHighWater(series: KkSeries): Promise<number> {
  const supabaseAdmin = createAdminClient();
  const re = new RegExp(String.raw`^${series}(\d+)$`, 'i');
  const PAGE = 1000;
  const numbers: number[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('kk_number')
      .ilike('kk_number', `${series}%`)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const match = re.exec(row.kk_number ?? '');
      if (match) numbers.push(parseInt(match[1], 10));
    }
    if (!data || data.length < PAGE) break;
  }
  return currentKkHighWater(numbers);
}

/** The number auto-assign would start from for a series. */
export async function suggestedKkStart(series: KkSeries): Promise<number> {
  return (await kkHighWater(series)) + 1;
}

// Next number for a series; skips ahead past anything that is somehow taken.
export async function nextKkNumber(series: KkSeries): Promise<string> {
  let next = await suggestedKkStart(series);
  for (let attempts = 0; attempts < 100 && (await findKkNumberOwner(`${series}${next}`)); attempts++) next++;
  return `${series}${next}`;
}
