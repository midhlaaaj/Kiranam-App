'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction, lookupLabel } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';
import { isIsoDay, isoDay } from '@/lib/format';
import { getAutoAssignKkNumber } from '@/lib/kkSettings';
import { KK_FORMAT_ERROR, KK_NUMBER_RE, type KkSeries } from '@/lib/kk';
import { toE164, validatePhoneNumber } from '@/lib/phone';
import { COUNTRIES } from '@/lib/countries';
import type { CountryCode } from 'libphonenumber-js/min';

export interface RegisterState {
  message?: string;
  error?: string;
}

// Fetched client-side by RegisterContributorForm on mount rather than
// awaited in the Contributors page itself, so the page's title/toolbar can
// render immediately instead of waiting on this DB round-trip.
export async function getAutoAssignKkNumberSetting(): Promise<boolean> {
  await verifyAdmin();
  return getAutoAssignKkNumber();
}

// Fetched client-side by RegisterContributorForm on mount, same reasoning as
// getAutoAssignKkNumberSetting above — lets the coordinator-assignment combobox
// populate without the Contributors page itself waiting on this query.
export async function getCoordinatorsForAssignment() {
  await verifyAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'coordinator')
    .order('full_name', { ascending: true });
  return data || [];
}

// Fetched by ContributorQuickViewModal — a compact view/edit popup opened
// from a Contributors table row or from a duplicate-phone match surfaced
// while registering, as an alternative to the full detail page.
export async function getContributorQuickView(contributorId: string) {
  await verifyAdmin();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, kk_number')
    .eq('id', contributorId)
    .single();
  if (error || !profile) throw new Error('Contributor not found.');

  const { data: assignment } = await supabase
    .from('contributor_assignments')
    .select('coordinator_id')
    .eq('contributor_id', contributorId)
    .maybeSingle();

  let coordinator: { id: string; full_name: string | null; phone: string | null } | null = null;
  if (assignment?.coordinator_id) {
    const { data: vol } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', assignment.coordinator_id)
      .maybeSingle();
    coordinator = vol;
  }

  return { ...profile, coordinator };
}

// Backfills a KK number for a contributor who was registered (in this system
// or offline, before it existed) without one — used by the "Check KK number
// coverage" list on the Settings page.
export async function assignKkNumber(contributorId: string, kkNumberInput: string) {
  const admin = await verifyAdmin();

  const kkNumber = kkNumberInput.trim().toUpperCase();
  if (!KK_NUMBER_RE.test(kkNumber)) throw new Error(KK_FORMAT_ERROR);

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ kk_number: kkNumber }).eq('id', contributorId);
  if (error) throw new Error(friendlyErrorMessage(error.message));

  await logAction(admin.id, 'assign_kk_number', 'profiles', contributorId, {
    kkNumber,
    label: await lookupLabel('profiles', contributorId),
  });
  revalidatePath('/contributors');
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath('/settings');
}

export async function registerContributor(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const admin = await verifyAdmin();

  const fullName = String(formData.get('full_name') || '').trim();
  const dialCode = String(formData.get('dial_code') || '91').replace(/\D/g, '') || '91';
  const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '');
  const monthlyAmountRaw = String(formData.get('monthly_amount') || '').trim();
  const monthlyAmount = monthlyAmountRaw ? Number(monthlyAmountRaw) : null;
  const kkNumberInput = String(formData.get('kk_number') || '').trim();
  const kkSeries: KkSeries = formData.get('kk_series') === 'KKG' ? 'KKG' : 'KK';
  const coordinatorId = String(formData.get('coordinatorId') || '').trim();

  if (!fullName) return { error: 'Full name is required.' };

  // dial_code alone is ambiguous (+1 is both US and Canada, etc.) — fall back
  // to the first country matching this dial code, same choice the <select>
  // options list presents in that order.
  const country = COUNTRIES.find((c) => c.dialCode === dialCode);
  const phoneError = country
    ? validatePhoneNumber(phoneDigits, country.iso2 as CountryCode)
    : 'Enter a valid phone number.';
  if (phoneError) return { error: phoneError };

  if (monthlyAmount !== null && !(monthlyAmount > 0)) return { error: 'Monthly amount must be greater than zero.' };

  const phoneE164 = toE164(dialCode, phoneDigits, country!.iso2 as CountryCode);
  const supabaseAdmin = createAdminClient();
  const autoAssignKkNumber = await getAutoAssignKkNumber();

  let kkNumber: string;
  if (autoAssignKkNumber) {
    kkNumber = await nextKkNumber(supabaseAdmin, kkSeries);
  } else {
    if (!kkNumberInput) return { error: 'KK number is required.' };
    if (!KK_NUMBER_RE.test(kkNumberInput)) return { error: KK_FORMAT_ERROR };
    kkNumber = kkNumberInput.toUpperCase();
  }

  // Phone is the auth identity, matching kiranam-app's phone-OTP login — no
  // password is set (phone accounts authenticate via OTP, not a password),
  // and no claim email is needed: the contributor "claims" this account
  // simply by logging into kiranam-app with this same phone number and
  // completing the normal OTP flow, same as any other signup/login.
  // handle_new_user() fires on insert same as any other signup, creating
  // the profiles row with phone already set.
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: phoneE164,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const isDuplicate =
      createError?.code === 'phone_exists' ||
      createError?.code === 'user_already_exists' ||
      /already exists|already been registered|already registered/i.test(createError?.message || '');

    if (createError) console.error('registerContributor: createUser failed:', createError);

    const message = isDuplicate
      ? `A contributor with this phone number already exists.`
      : `Could not register this contributor${createError?.message ? ` (${createError.message})` : ''}. Please try again.`;
    return { error: message };
  }

  const contributorId = created.user.id;

  // handle_new_user() only sets id/user_id/phone/email on the trigger-created
  // profiles row — full_name still needs to be filled in here. Setting it
  // now (rather than leaving it for the contributor's first login) is what
  // lets otp.tsx recognize this as an existing, already-registered account
  // and skip straight past /register the first time they actually log in.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    // Registered by an admin who holds the person's consent for WhatsApp messages
    // (login codes, receipts, reminders) — recorded here so they aren't shown as
    // "no WhatsApp consent" and can be included in broadcasts.
    .update({ full_name: fullName, kk_number: kkNumber, whatsapp_consent: true })
    .eq('id', contributorId);
  if (profileError) {
    const message = /duplicate key|unique/i.test(profileError.message)
      ? `Contributor was created, but ${kkNumber} is already assigned to someone else. Please edit their KK number manually.`
      : 'Contributor was created, but saving their name failed. Please edit it manually.';
    return { error: message };
  }

  // Autopay defaults off — a manually-registered contributor has no payment
  // method on file yet, so autopay can't actually run for them until they
  // (or an admin) sets one up. No commitments row at all when the admin
  // doesn't have an amount yet: monthly_amount is NOT NULL with a ₹500
  // column default, so inserting without it would show a made-up ₹500 in the
  // list. Without a row the list shows "—" and the app treats the contributor
  // as having no commitment yet; the real one is created once it's known.
  if (monthlyAmount !== null) {
    const { error: commitmentError } = await supabaseAdmin.from('commitments').insert({
      contributor_id: contributorId,
      monthly_amount: monthlyAmount,
      autopay_enabled: false,
    });
    if (commitmentError) {
      return { error: 'Contributor was created, but saving their commitment failed. Please add it manually.' };
    }
  }

  if (coordinatorId) {
    const { error: assignError } = await supabaseAdmin
      .from('contributor_assignments')
      .insert({ coordinator_id: coordinatorId, contributor_id: contributorId, source: 'admin' });
    if (assignError) {
      return { error: 'Contributor was created, but assigning their coordinator failed. Please assign it manually.' };
    }
  }

  await logAction(admin.id, 'register_contributor', 'profiles', contributorId, {
    fullName,
    label: fullName,
    monthlyAmount,
    kkNumber,
    coordinatorId: coordinatorId || null,
  });
  revalidatePath('/contributors');
  return { message: `${fullName} has been registered as a contributor. They can log in with this phone number.` };
}

// Highest number currently in use within a series (KK or KKG), +1. Each series
// counts on its own. profiles.kk_number is a free-form string (not a DB
// sequence), so this reads the max numeric suffix directly rather than relying
// on a counter — safe under this admin panel's low write concurrency for
// contributor registration.
async function nextKkNumber(supabaseAdmin: ReturnType<typeof createAdminClient>, series: KkSeries): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('kk_number')
    .not('kk_number', 'is', null)
    .ilike('kk_number', `${series}%`);

  const re = new RegExp(`^${series}(\\d+)$`, 'i');
  let max = 0;
  for (const row of data || []) {
    const match = re.exec(row.kk_number ?? '');
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${series}${max + 1}`;
}

export async function assignCoordinator(contributorId: string, formData: FormData) {
  const admin = await verifyAdmin();
  const coordinatorId = String(formData.get('coordinatorId') || '');
  if (!coordinatorId) return;

  const supabase = await createClient();

  // A contributor has at most one coordinator at a time (mirrors the
  // coordinator-side assignment UI), so picking a new one replaces the old
  // assignment rather than adding a second row.
  const { error: deleteError } = await supabase
    .from('contributor_assignments')
    .delete()
    .eq('contributor_id', contributorId);
  if (deleteError) throw new Error(deleteError.message);

  const { error } = await supabase
    .from('contributor_assignments')
    // Explicit 'admin' even though it's also the column default — this is
    // the one non-referral path that writes this table, so it should say
    // so rather than rely on a default that could change later.
    .insert({ coordinator_id: coordinatorId, contributor_id: contributorId, source: 'admin' });
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'assign_contributor', 'contributor_assignments', contributorId, {
    coordinatorId: coordinatorId,
    contributorId: contributorId,
    label: await lookupLabel('profiles', contributorId),
    otherLabel: await lookupLabel('profiles', coordinatorId),
  });
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath(`/coordinators/${coordinatorId}`);
}

export async function unassignCoordinator(contributorId: string, coordinatorId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('contributor_assignments')
    .delete()
    .eq('contributor_id', contributorId)
    .eq('coordinator_id', coordinatorId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'unassign_contributor', 'contributor_assignments', contributorId, {
    coordinatorId: coordinatorId,
    contributorId: contributorId,
    label: await lookupLabel('profiles', contributorId),
    otherLabel: await lookupLabel('profiles', coordinatorId),
  });
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath(`/coordinators/${coordinatorId}`);
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
  if (date && !isIsoDay(date)) return { error: 'Enter a valid date.' };
  // The picker's `max` already blocks this; checked again here since the
  // form value is client-controlled. Compared in India time, not the
  // server's UTC, so "today" is never rejected late in the IST evening.
  if (date && date > isoDay()) return { error: "The payment date can't be in the future." };

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

  await logAction(admin.id, 'add_offline_payment', 'contributions', contributorId, {
    amount,
    note,
    campaignId,
    campaignTitle,
    label: await lookupLabel('profiles', contributorId),
  });
  revalidatePath(`/contributors/${contributorId}`);
  revalidatePath('/contributions');
  revalidatePath('/campaigns');
  return { message: campaignTitle ? `Contribution to "${campaignTitle}" recorded.` : 'Offline payment recorded.' };
}
