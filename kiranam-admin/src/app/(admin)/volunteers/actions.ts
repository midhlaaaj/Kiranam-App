'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';
import { validatePhoneNumber } from '@/lib/phone';
import { COUNTRIES } from '@/lib/countries';
import type { CountryCode } from 'libphonenumber-js/min';

export interface RegisterVolunteerState {
  message?: string;
  error?: string;
  /** Set when registration failed because this phone number already belongs
   * to an existing contributor — lets the form offer "upgrade to volunteer"
   * instead of a dead-end error. */
  existingContributor?: { id: string; fullName: string | null };
}

// For a volunteer who was recruited/working offline (before this system, or
// outside the in-app application flow) but has never opened the app.
// Pre-creates their login by phone number, same pattern as registering a
// contributor — they claim it by logging into kiranam-app with this same
// phone number. Any of their existing contributors are assigned afterwards
// from this volunteer's detail page, not here.
export async function registerVolunteer(
  _prevState: RegisterVolunteerState,
  formData: FormData
): Promise<RegisterVolunteerState> {
  const admin = await verifyAdmin();

  const fullName = String(formData.get('full_name') || '').trim();
  const dialCode = String(formData.get('dial_code') || '91').replace(/\D/g, '') || '91';
  const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '');
  const kkNumberInput = String(formData.get('kk_number') || '').trim();

  if (!fullName) return { error: 'Full name is required.' };

  const country = COUNTRIES.find((c) => c.dialCode === dialCode);
  const phoneError = country
    ? validatePhoneNumber(phoneDigits, country.iso2 as CountryCode)
    : 'Enter a valid phone number.';
  if (phoneError) return { error: phoneError };

  let kkNumber: string | null = null;
  if (kkNumberInput) {
    if (!/^KK\d+$/i.test(kkNumberInput)) return { error: 'KK number must look like KK1.' };
    kkNumber = kkNumberInput.toUpperCase();
  }

  const phoneE164 = `+${dialCode}${phoneDigits}`;
  const supabaseAdmin = createAdminClient();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: phoneE164,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const isDuplicate =
      createError?.code === 'phone_exists' ||
      createError?.code === 'user_already_exists' ||
      createError?.status === 422 ||
      /already exists|already been registered|already registered/i.test(createError?.message || '');

    if (createError) console.error('registerVolunteer: createUser failed:', createError);

    if (isDuplicate) {
      // profiles.phone is stored without the leading "+" (Supabase Auth's
      // own normalization) even though phoneE164 above has one — match both.
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role')
        .or(`phone.eq.${dialCode}${phoneDigits},phone.eq.${phoneE164}`)
        .maybeSingle();

      if (existing && existing.role === 'contributor') {
        return {
          error: `${existing.full_name || 'This contributor'} is already registered with this phone number as a contributor.`,
          existingContributor: { id: existing.id, fullName: existing.full_name },
        };
      }

      return { error: 'A volunteer with this phone number already exists.' };
    }

    return { error: 'Could not register this volunteer. Please try again.' };
  }

  const volunteerId = created.user.id;

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: fullName, role: 'volunteer', ...(kkNumber ? { kk_number: kkNumber } : {}) })
    .eq('id', volunteerId);
  if (profileError) {
    const message = /duplicate key|unique/i.test(profileError.message)
      ? `Volunteer was created, but ${kkNumber} is already assigned to someone else. Please edit their KK number manually.`
      : friendlyErrorMessage(profileError.message);
    return { error: message };
  }

  await logAction(admin.id, 'register_volunteer', 'profiles', volunteerId, { fullName, kkNumber });
  revalidatePath('/volunteers');
  return { message: `${fullName} has been registered as a volunteer. They can log in with this phone number.` };
}

// Promotes an existing contributor to volunteer in place, rather than
// failing registration outright when the phone number they'd register with
// already belongs to a contributor account — offered from
// RegisterVolunteerForm after that duplicate-phone error.
export async function upgradeContributorToVolunteer(contributorId: string, kkNumberInput?: string) {
  const admin = await verifyAdmin();

  let kkNumber: string | null = null;
  if (kkNumberInput?.trim()) {
    kkNumber = kkNumberInput.trim().toUpperCase();
    if (!/^KK\d+$/i.test(kkNumber)) throw new Error('KK number must look like KK1.');
  }

  const supabase = await createClient();
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('full_name, kk_number')
    .eq('id', contributorId)
    .single();
  if (fetchError) throw new Error(friendlyErrorMessage(fetchError.message));

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'volunteer', ...(kkNumber && !profile.kk_number ? { kk_number: kkNumber } : {}) })
    .eq('id', contributorId);
  if (error) {
    const message = /duplicate key|unique/i.test(error.message)
      ? `${kkNumber} is already assigned to someone else. Please edit their KK number manually.`
      : friendlyErrorMessage(error.message);
    throw new Error(message);
  }

  await logAction(admin.id, 'upgrade_contributor_to_volunteer', 'profiles', contributorId, { kkNumber });
  revalidatePath('/volunteers');
  revalidatePath('/contributors');
  revalidatePath(`/contributors/${contributorId}`);
  return { fullName: profile.full_name as string | null };
}

// Fetched by VolunteerQuickViewModal — a compact view/edit popup opened from
// a Volunteers table row or from a duplicate-phone match surfaced while
// registering, as an alternative to the full detail page.
export async function getVolunteerQuickView(volunteerId: string) {
  await verifyAdmin();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, kk_number')
    .eq('id', volunteerId)
    .single();
  if (error || !profile) throw new Error('Volunteer not found.');

  const { count } = await supabase
    .from('contributor_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('volunteer_id', volunteerId);

  return { ...profile, assignedCount: count || 0 };
}

// KK number is the only field VolunteerQuickViewModal lets an admin edit —
// same update as assignKkNumber in contributors/actions.ts (profiles.kk_number
// isn't role-specific), duplicated here rather than imported so this file
// doesn't reach into a sibling route's actions module.
export async function updateVolunteerKkNumber(volunteerId: string, kkNumberInput: string) {
  const admin = await verifyAdmin();

  const kkNumber = kkNumberInput.trim().toUpperCase();
  if (!/^KK\d+$/i.test(kkNumber)) throw new Error('KK number must look like KK1.');

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ kk_number: kkNumber }).eq('id', volunteerId);
  if (error) {
    const message = /duplicate key|unique/i.test(error.message)
      ? `${kkNumber} is already assigned to someone else.`
      : friendlyErrorMessage(error.message);
    throw new Error(message);
  }

  await logAction(admin.id, 'assign_kk_number', 'profiles', volunteerId, { kkNumber });
  revalidatePath('/volunteers');
}

export async function assignContributor(volunteerId: string, formData: FormData) {
  const admin = await verifyAdmin();
  const contributorId = String(formData.get('contributorId') || '');
  if (!contributorId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from('contributor_assignments')
    .insert({ volunteer_id: volunteerId, contributor_id: contributorId });
  if (error && !error.message.includes('duplicate')) throw new Error(error.message);

  await logAction(admin.id, 'assign_contributor', 'contributor_assignments', volunteerId, { contributorId });
  revalidatePath(`/volunteers/${volunteerId}`);
}

export async function unassignContributor(volunteerId: string, contributorId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('contributor_assignments')
    .delete()
    .eq('volunteer_id', volunteerId)
    .eq('contributor_id', contributorId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'unassign_contributor', 'contributor_assignments', volunteerId, { contributorId });
  revalidatePath(`/volunteers/${volunteerId}`);
}

export async function approveApplication(applicationId: string, profileId: string) {
  await verifyAdmin();
  const supabase = await createClient();

  // Single RPC so the application-status update, the role promotion, and
  // the audit log insert all commit atomically — a partial failure here
  // previously left applications stuck "approved" with the profile's role
  // never flipped to 'volunteer'.
  const { error } = await supabase.rpc('approve_volunteer_application', {
    p_application_id: applicationId,
    p_profile_id: profileId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/volunteers/${profileId}`);
  revalidatePath('/volunteers');
}

export async function rejectApplication(applicationId: string, profileId: string, reason?: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('volunteer_applications')
    .update({
      status: 'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason?.trim() || null,
    })
    .eq('id', applicationId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'reject_volunteer_application', 'volunteer_applications', applicationId, { profileId });
  revalidatePath(`/volunteers/${profileId}`);
  revalidatePath('/volunteers');
}
