'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';
import { AUTO_ASSIGN_KEY, suggestedKkStart } from '@/lib/kkSettings';
import type { KkSeries } from '@/lib/kk';

// KK is for Indian numbers (+91), KKG for every other country.
const isSeries = (v: unknown): v is KkSeries => v === 'KK' || v === 'KKG';

type AdminClient = ReturnType<typeof createAdminClient>;

/** Contributors with a name and no KK / KKG number at all, whose phone belongs
 * to this series, oldest sign-up first. Accounts with no name are left out —
 * they are unfinished registrations, and a number on a nameless account is
 * exactly the half-finished state to avoid. Someone who already holds a number
 * in the other series (e.g. an Indian contributor filed under KKG) counts as
 * having one. */
async function contributorsNeedingNumber(admin: AdminClient, series: KkSeries) {
  const rows: { id: string }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder generics
    let query: any = admin
      .from('profiles')
      .select('id')
      .eq('role', 'contributor')
      .is('kk_number', null)
      .not('phone', 'is', null)
      .neq('full_name', '')
      .not('full_name', 'is', null);
    query =
      series === 'KK'
        ? query.or('phone.like.91%,phone.like.+91%')
        : query.not('phone', 'like', '91%').not('phone', 'like', '+91%');
    const { data, error } = await query.order('created_at', { ascending: true }).order('id').range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export interface AutoAssignPreview {
  error?: string;
  /** How many contributors would be numbered. */
  count?: number;
  /** The number the run would start from. */
  start?: number;
}

/** What turning auto-assign on would do — shown before anything is written. */
export async function previewAutoAssign(series: KkSeries): Promise<AutoAssignPreview> {
  await verifyAdmin();
  if (!isSeries(series)) return { error: 'Unknown series.' };
  try {
    const admin = createAdminClient();
    const [people, start] = await Promise.all([contributorsNeedingNumber(admin, series), suggestedKkStart(series)]);
    return { count: people.length, start };
  } catch (err) {
    return { error: friendlyErrorMessage(err instanceof Error ? err.message : 'Could not check.') };
  }
}

export interface AutoAssignResult {
  error?: string;
  assigned?: number;
  first?: string;
  last?: string;
}

/** Numbers everyone returned by previewAutoAssign (oldest first, from
 * `startNumber`, skipping numbers already taken) and then switches auto-assign
 * on for the series. If a number can't be saved the run stops and the switch
 * stays off; running it again carries on with whoever is still missing one. */
export async function enableAutoAssign(series: KkSeries, startNumber: number): Promise<AutoAssignResult> {
  const admin = await verifyAdmin();
  if (!isSeries(series)) return { error: 'Unknown series.' };
  const start = Math.floor(Number(startNumber));
  if (!Number.isFinite(start) || start < 1) return { error: 'Start number must be 1 or higher.' };

  const supabase = createAdminClient();
  try {
    const people = await contributorsNeedingNumber(supabase, series);

    // Every number already used in this series, so none is handed out twice.
    const taken = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('profiles')
        .select('kk_number')
        .ilike('kk_number', `${series}%`)
        .order('id')
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      (data ?? []).forEach((r) => r.kk_number && taken.add(r.kk_number.toUpperCase()));
      if (!data || data.length < 1000) break;
    }

    let n = start;
    let assigned = 0;
    let first: string | undefined;
    let last: string | undefined;
    for (const person of people) {
      for (let attempt = 0; ; attempt++) {
        while (taken.has(`${series}${n}`)) n++;
        const kkNumber = `${series}${n}`;
        const { error } = await supabase
          .from('profiles')
          .update({ kk_number: kkNumber })
          .eq('id', person.id)
          .is('kk_number', null);
        if (!error) {
          taken.add(kkNumber);
          assigned++;
          first ??= kkNumber;
          last = kkNumber;
          n++;
          break;
        }
        // Lost a race for this number — try the next one a couple of times.
        if (/duplicate key|unique/i.test(error.message) && attempt < 3) {
          taken.add(kkNumber);
          continue;
        }
        throw new Error(`Stopped after ${assigned} of ${people.length}: ${friendlyErrorMessage(error.message)}`);
      }
    }

    const { error: settingError } = await supabase
      .from('app_settings')
      .upsert({ key: AUTO_ASSIGN_KEY[series], value: 'true', updated_at: new Date().toISOString() });
    if (settingError) throw new Error(friendlyErrorMessage(settingError.message));

    await logAction(admin.id, 'enable_auto_assign_kk', 'app_settings', 'app_settings', {
      series,
      assigned,
      first: first ?? null,
      last: last ?? null,
    });
    revalidatePath('/settings');
    revalidatePath('/contributors');
    return { assigned, first, last };
  } catch (err) {
    revalidatePath('/contributors');
    return { error: err instanceof Error ? err.message : 'Something went wrong.' };
  }
}

/** Turns auto-assign off for a series; numbers already given stay as they are. */
export async function disableAutoAssign(series: KkSeries): Promise<{ error?: string }> {
  const admin = await verifyAdmin();
  if (!isSeries(series)) return { error: 'Unknown series.' };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: AUTO_ASSIGN_KEY[series], value: 'false', updated_at: new Date().toISOString() });
  if (error) return { error: friendlyErrorMessage(error.message) };
  await logAction(admin.id, 'disable_auto_assign_kk', 'app_settings', 'app_settings', { series });
  revalidatePath('/settings');
  revalidatePath('/contributors');
  return {};
}
