'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';
import { sendEmail } from '@/lib/email/resend';
import { claimAccountEmail } from '@/lib/email/templates';

export interface RegisterState {
  message?: string;
  error?: string;
}

export async function registerContributor(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const admin = await verifyAdmin();

  const fullName = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '');
  const monthlyAmount = Number(formData.get('monthly_amount') || 0);

  if (!fullName) return { error: 'Full name is required.' };
  if (!email) return { error: 'Email is required.' };
  if (phoneDigits.length !== 10) return { error: 'Enter a valid 10-digit phone number.' };
  if (!(monthlyAmount > 0)) return { error: 'Monthly amount must be greater than zero.' };

  const phoneE164 = `+91${phoneDigits}`;
  const supabaseAdmin = createAdminClient();

  // Email is now the auth identity (kiranam-app moved from phone-OTP to
  // email+password login) — phone is stored as a plain contact field only.
  // No usable password is set here; the contributor claims their account via
  // the "set your password" email below (a Supabase recovery link, same
  // mechanism as a normal forgot-password flow).
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    phone: phoneE164,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const isDuplicate =
      createError?.code === 'email_exists' ||
      createError?.code === 'phone_exists' ||
      createError?.code === 'user_already_exists' ||
      createError?.status === 422 ||
      /already exists|already been registered|already registered/i.test(createError?.message || '');

    if (createError) console.error('registerContributor: createUser failed:', createError);

    const message = isDuplicate
      ? `A contributor with this email or phone number already exists.`
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

  // Best-effort claim email — same underlying mechanism as forgot-password
  // (a single-use recovery token routed through mobile-auth-bridge into the
  // app), so a failed send here doesn't block the registration itself; an
  // admin can still trigger a normal "forgot password" from the app later.
  const authSiteUrl = process.env.NEXT_PUBLIC_AUTH_SITE_URL || 'http://localhost:3000';
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('registerContributor: generateLink failed:', linkError);
  } else {
    const claimUrl = `${authSiteUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=recovery&next=${encodeURIComponent('kiranamapp://reset-password')}`;
    const { error: emailError } = await sendEmail({
      to: email,
      subject: 'Set your password for Kiranam',
      html: claimAccountEmail({ claimUrl, fullName }),
    });
    if (emailError) console.error('registerContributor: claim email failed:', emailError);
  }

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

export async function assignVolunteer(contributorId: string, formData: FormData) {
  const admin = await verifyAdmin();
  const volunteerId = String(formData.get('volunteerId') || '');
  if (!volunteerId) return;

  const supabase = await createClient();

  // A contributor has at most one volunteer at a time (mirrors the
  // volunteer-side assignment UI), so picking a new one replaces the old
  // assignment rather than adding a second row.
  const { error: deleteError } = await supabase
    .from('contributor_assignments')
    .delete()
    .eq('contributor_id', contributorId);
  if (deleteError) throw new Error(deleteError.message);

  const { error } = await supabase
    .from('contributor_assignments')
    .insert({ volunteer_id: volunteerId, contributor_id: contributorId });
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'assign_contributor', 'contributor_assignments', contributorId, { volunteerId });
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath(`/volunteers/${volunteerId}`);
}

export async function unassignVolunteer(contributorId: string, volunteerId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('contributor_assignments')
    .delete()
    .eq('contributor_id', contributorId)
    .eq('volunteer_id', volunteerId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'unassign_contributor', 'contributor_assignments', contributorId, { volunteerId });
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath(`/volunteers/${volunteerId}`);
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
  const campaignId = String(formData.get('campaign_id') || '').trim() || null;

  if (!(amount > 0)) return { error: 'Amount must be greater than zero.' };

  const supabase = await createClient();

  let campaignTitle: string | null = null;
  if (campaignId) {
    const { data: campaign } = await supabase.from('campaigns').select('title').eq('id', campaignId).maybeSingle();
    if (!campaign) return { error: 'Selected campaign could not be found.' };
    campaignTitle = campaign.title;
  }

  // A campaign-linked contribution auto-bumps campaigns.raised via the
  // on_contribution_bump_campaign trigger — same as a real donation through
  // the app — so the label reflects the campaign rather than a generic note.
  const { error } = await supabase.from('contributions').insert({
    contributor_id: contributorId,
    campaign_id: campaignId,
    amount,
    label: campaignTitle ? `Campaign: ${campaignTitle}` : (note || 'Offline payment'),
    status: 'success',
    is_offline: true,
    collected_by: admin.id,
    note: note || null,
    ...(date ? { created_at: new Date(date).toISOString() } : {}),
  });
  if (error) return { error: friendlyErrorMessage(error.message) };

  await logAction(admin.id, 'add_offline_payment', 'contributions', contributorId, { amount, note, campaignId });
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath('/contributions');
  revalidatePath('/campaigns');
  return { message: campaignTitle ? `Contribution to "${campaignTitle}" recorded.` : 'Offline payment recorded.' };
}
