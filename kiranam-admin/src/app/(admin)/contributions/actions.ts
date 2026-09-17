'use server';

import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { addOfflinePayment, type OfflinePaymentState } from '../contributors/actions';

export type { OfflinePaymentState };

export interface ManualContributionOptions {
  contributors: {
    id: string;
    full_name: string | null;
    phone: string | null;
    monthlyAmount: number | null;
    paidThisMonth: boolean;
  }[];
  campaigns: { id: string; title: string }[];
}

// Fetched client-side by ManualContributionButton on mount rather than
// awaited in the Contributions page itself, so the page's title/action
// button can render immediately instead of waiting on these DB round-trips.
// The picker inside the (initially closed) modal is the only thing that
// needs this data.
export async function getManualContributionOptions(): Promise<ManualContributionOptions> {
  await verifyAdmin();
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ data: rawContributors }, { data: commitments }, { data: activeCampaigns }, { data: paidThisMonthRows }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone').eq('role', 'contributor').order('full_name', { ascending: true }),
    supabase.from('commitments').select('contributor_id, monthly_amount'),
    supabase.from('campaigns').select('id, title').eq('status', 'active').order('title', { ascending: true }),
    supabase.from('contributions').select('contributor_id').eq('status', 'success').gte('created_at', monthStart),
  ]);

  const monthlyAmountByContributor = new Map((commitments || []).map((c) => [c.contributor_id, Number(c.monthly_amount)]));
  const paidThisMonthIds = new Set((paidThisMonthRows || []).map((r) => r.contributor_id));
  const contributors = (rawContributors || []).map((c) => ({
    ...c,
    monthlyAmount: monthlyAmountByContributor.get(c.id) ?? null,
    paidThisMonth: paidThisMonthIds.has(c.id),
  }));

  return { contributors, campaigns: activeCampaigns || [] };
}

/** Same offline-payment recording as a contributor's own detail page, just
 * entered from the global Contributions list — the contributor is picked in
 * the form instead of being implied by the page you're on.
 *
 * verifyAdmin() is called explicitly here too, even though addOfflinePayment
 * already checks it internally — this function currently only works because
 * it delegates there, and a future refactor that stops delegating shouldn't
 * silently lose the auth check. */
export async function recordManualContribution(
  _prevState: OfflinePaymentState,
  formData: FormData
): Promise<OfflinePaymentState> {
  await verifyAdmin();

  const contributorId = String(formData.get('contributor_id') || '').trim();
  if (!contributorId) return { error: 'Select a contributor.' };

  return addOfflinePayment(contributorId, _prevState, formData);
}
