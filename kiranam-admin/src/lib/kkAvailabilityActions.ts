'use server';

import { verifyAdmin } from '@/lib/dal';
import { findKkNumberOwner, kkInUseMessage } from '@/lib/kkSettings';
import { KK_NUMBER_RE } from '@/lib/kk';

// Checked when the admin leaves the KK number field of a registration form, so
// a number that's already taken is flagged before the rest of the form is
// filled in — registration re-checks on submit.
export async function checkKkAvailability(kkNumber: string): Promise<{ inUse: boolean; message?: string }> {
  await verifyAdmin();
  const value = kkNumber.trim().toUpperCase();
  if (!KK_NUMBER_RE.test(value)) return { inUse: false };
  const owner = await findKkNumberOwner(value);
  return owner ? { inUse: true, message: kkInUseMessage(value, owner.full_name) } : { inUse: false };
}
