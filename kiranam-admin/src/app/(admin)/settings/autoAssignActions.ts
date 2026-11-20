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

/** People (contributors and coordinators) with no KK / KKG number, whose phone
 * belongs to this series, oldest sign-up first. Accounts with no name yet are
 * included — they still get a number. */
async function peopleNeedingNumber(admin: AdminClient, series: KkSeries) {
  const fetchAll = async () => {
    const rows: { id: string }[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder generics
      let query: any = admin
        .from('profiles')
        .select('id')
        .in('role', ['contributor', 'coordinator'])
        .is('kk_number', null)
        .not('phone', 'is', null);
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
  };
  return { people: await fetchAll() };
}

export interface AutoAssignPreview {
  error?: string;
  /** How many people would be numbered. */
  count?: number;
  /** The number the run would start from. */
  start?: number;
}

/** What a run would do — shown before anything is written. */
export async function previewAutoAssign(series: KkSeries): Promise<AutoAssignPreview> {
  await verifyAdmin();
  if (!isSeries(series)) return { error: 'Unknown series.' };
  try {
    const admin = createAdminClient();
    const [{ people }, start] = await Promise.all([peopleNeedingNumber(admin, series), suggestedKkStart(series)]);
    return { count: people.length, start };
  } catch (err) {
    return { error: friendlyErrorMessage(err instanceof Error ? err.message : 'Could not check.') };
  }
}

export interface AssignBatchResult {
  error?: string;
  /** Numbered in this batch. */
  assigned?: number;
  /** Still without a number after this batch. */
  remaining?: number;
  /** Where the next batch should start. */
  next?: number;
  first?: string;
  last?: string;
}

/** Numbers up to `limit` of the people returned by previewAutoAssign (oldest
 * first, from `startNumber`, skipping numbers already taken). The client calls
 * this repeatedly, feeding back `next`, until `remaining` is 0 — which is what
 * drives the progress bar. If a number can't be saved the batch stops with an
 * error; running again carries on with whoever is still missing one. */
export async function assignKkBatch(series: KkSeries, startNumber: number, limit = 25): Promise<AssignBatchResult> {
  await verifyAdmin();
  if (!isSeries(series)) return { error: 'Unknown series.' };
  const start = Math.floor(Number(startNumber));
  if (!Number.isFinite(start) || start < 1) return { error: 'Start number must be 1 or higher.' };

  const supabase = createAdminClient();
  try {
    const { people: all } = await peopleNeedingNumber(supabase, series);
    const people = all.slice(0, Math.max(1, Math.min(100, limit)));

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
        throw new Error(friendlyErrorMessage(error.message));
      }
    }
    revalidatePath('/contributors');
    return { assigned, remaining: all.length - assigned, next: n, first, last };
  } catch (err) {
    revalidatePath('/contributors');
    return { error: err instanceof Error ? err.message : 'Something went wrong.' };
  }
}

/** Switches auto-assign on for a series once its backlog has been numbered. */
export async function finishEnableAutoAssign(
  series: KkSeries,
  summary: { assigned: number; first?: string; last?: string }
): Promise<{ error?: string }> {
  const admin = await verifyAdmin();
  if (!isSeries(series)) return { error: 'Unknown series.' };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: AUTO_ASSIGN_KEY[series], value: 'true', updated_at: new Date().toISOString() });
  if (error) return { error: friendlyErrorMessage(error.message) };
  await logAction(admin.id, 'enable_auto_assign_kk', 'app_settings', 'app_settings', {
    series,
    assigned: summary.assigned,
    first: summary.first ?? null,
    last: summary.last ?? null,
  });
  revalidatePath('/settings');
  return {};
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
