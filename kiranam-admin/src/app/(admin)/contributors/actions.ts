'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';

export interface RegisterState {
  message?: string;
  error?: string;
}

export async function registerContributor(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const admin = await verifyAdmin();

  const fullName = String(formData.get('full_name') || '').trim();
  const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '');
  const monthlyAmount = Number(formData.get('monthly_amount') || 0);

  if (!fullName) return { error: 'Full name is required.' };
  if (phoneDigits.length !== 10) return { error: 'Enter a valid 10-digit phone number.' };
  if (!(monthlyAmount > 0)) return { error: 'Monthly amount must be greater than zero.' };

  const phoneE164 = `+91${phoneDigits}`;
  const supabaseAdmin = createAdminClient();

  // No password set — the contributor claims this login later by signing in
  // with the same phone number via OTP (Supabase matches on phone), exactly
  // like a normal signup. This just pre-creates the auth identity + profile.
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: phoneE164,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    // Phone number is the primary identifier — no two users can share one.
    // Supabase's exact wording/error code for this varies by version, so
    // check both rather than relying on one exact string match.
    const isDuplicatePhone =
      createError?.code === 'phone_exists' ||
      createError?.code === 'user_already_exists' ||
      createError?.status === 422 ||
      /already exists|already been registered|already registered/i.test(createError?.message || '');

    if (createError) console.error('registerContributor: createUser failed:', createError);

    const message = isDuplicatePhone
      ? `A contributor with the phone number ${phoneE164} already exists.`
      : 'Could not register this contributor. Please try again.';
    return { error: message };
  }

  const contributorId = created.user.id;

  // handle_new_user() only sets id/user_id/phone/email on the trigger-created
  // profiles row — full_name still needs to be filled in here.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', contributorId);
  if (profileError) return { error: 'Contributor was created, but saving their name failed. Please edit it manually.' };

  // Autopay defaults off — a manually-registered contributor has no payment
  // method on file yet, so autopay can't actually run for them until they
  // (or an admin) sets one up.
  const { error: commitmentError } = await supabaseAdmin.from('commitments').insert({
    contributor_id: contributorId,
    monthly_amount: monthlyAmount,
    autopay_enabled: false,
  });
  if (commitmentError) {
    return { error: 'Contributor was created, but saving their commitment failed. Please add it manually.' };
  }

  await logAction(admin.id, 'register_contributor', 'profiles', contributorId, { fullName, monthlyAmount });
  revalidatePath('/contributors');
  return { message: `${fullName} has been registered as a contributor.` };
}

export interface OfflinePaymentState {
  message?: string;
  error?: string;
}

export async function addOfflinePayment(
  contributorId: string,
  _prevState: OfflinePaymentState,
  formData: FormData
): Promise<OfflinePaymentState> {
  const admin = await verifyAdmin();

  const amount = Number(formData.get('amount') || 0);
  const date = String(formData.get('date') || '').trim();
  const note = String(formData.get('note') || '').trim();

  if (!(amount > 0)) return { error: 'Amount must be greater than zero.' };

  const supabase = await createClient();
  const { error } = await supabase.from('contributions').insert({
    contributor_id: contributorId,
    amount,
    label: note || 'Offline payment',
    status: 'success',
    is_offline: true,
    collected_by: admin.id,
    note: note || null,
    ...(date ? { created_at: new Date(date).toISOString() } : {}),
  });
  if (error) return { error: friendlyErrorMessage(error.message) };

  await logAction(admin.id, 'add_offline_payment', 'contributions', contributorId, { amount, note });
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath('/contributions');
  return { message: 'Offline payment recorded.' };
}
