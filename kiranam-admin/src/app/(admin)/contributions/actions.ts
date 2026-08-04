'use server';

import { verifyAdmin } from '@/lib/dal';
import { addOfflinePayment, type OfflinePaymentState } from '../contributors/actions';

export type { OfflinePaymentState };

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
