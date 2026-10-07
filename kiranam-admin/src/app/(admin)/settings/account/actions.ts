'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

const MIN_PASSWORD = 8;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

// Rough email shape check — the real validator is Supabase Auth, which
// rejects anything malformed when updateUser({ email }) is called. This
// just stops obvious typos before the network round-trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProfileState {
  message?: string;
  error?: string;
  emailChangePending?: boolean;
  /** Echoed back on error — React resets the form after the action, so the
   * fields re-render from these instead of losing what was typed. */
  values?: { fullName: string; email: string };
}

// Shared account: this `profiles` row and `auth.users` identity are the
// exact same one the WhatsApp comm center's "Your profile" edits — see
// members-tab.tsx / the comm center settings redirect. Keep field
// semantics (what gets written where) identical to profile-form.tsx so
// the two never drift into different behavior for the same account.
export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const fullName = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const removeAvatar = formData.get('remove_avatar') === '1';
  const avatarFile = formData.get('avatar');

  const values = { fullName, email };
  if (!fullName) return { error: 'Full name is required.', values };
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.', values };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('avatar_url, email')
    .eq('id', admin.id)
    .single();
  if (profileError || !profile) return { error: 'Could not load your profile.', values };

  let nextAvatarUrl: string | null = profile.avatar_url ?? null;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!ALLOWED_AVATAR_MIME.has(avatarFile.type)) {
      return { error: 'Photo must be a PNG, JPEG, WebP, or GIF.', values };
    }
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: 'Photo must be under 2 MB.', values };
    }
    const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${admin.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: avatarFile.type,
      });
    if (uploadError) return { error: `Photo upload failed: ${uploadError.message}`, values };

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(path);
    nextAvatarUrl = publicUrl;
  } else if (removeAvatar) {
    nextAvatarUrl = null;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ full_name: fullName, avatar_url: nextAvatarUrl })
    .eq('id', admin.id);
  if (updateError) return { error: `Failed to save: ${updateError.message}`, values };

  // Email change goes through Supabase Auth, which emails a confirmation
  // to both the old and new addresses — profiles.email updates only
  // after the link is clicked, same as the comm center's version.
  let emailChangePending = false;
  if (email.toLowerCase() !== (profile.email ?? '').toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) {
      revalidatePath('/settings/account');
      return {
        message: 'Profile saved.',
        error: `Email wasn't changed: ${emailError.message}`,
        values,
      };
    }
    emailChangePending = true;
  }

  revalidatePath('/settings/account');
  return {
    message: emailChangePending
      ? `Profile saved. Check both ${profile.email} and ${email} to confirm the email change.`
      : 'Profile saved.',
    emailChangePending,
  };
}

export interface PasswordFormState {
  message?: string;
  error?: string;
}

export async function changePassword(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const admin = await verifyAdmin();
  if (!admin.email) return { error: "Your account has no email on file — can't verify your current password." };

  const current = String(formData.get('current_password') || '');
  const next = String(formData.get('new_password') || '');
  const confirm = String(formData.get('confirm_password') || '');

  if (next.length < MIN_PASSWORD) {
    return { error: `New password must be at least ${MIN_PASSWORD} characters.` };
  }
  if (next !== confirm) return { error: "New password and confirmation don't match." };

  const supabase = await createClient();

  // Supabase doesn't expose a "verify password without issuing a
  // session" API, so re-authenticate with the provided current password
  // first. If it matches, the session refreshes silently; if not, abort
  // before calling updateUser.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: admin.email,
    password: current,
  });
  if (signInError) return { error: 'Current password is incorrect.' };

  const { error: updateError } = await supabase.auth.updateUser({ password: next });
  if (updateError) return { error: `Could not update password: ${updateError.message}` };

  return { message: 'Password updated.' };
}

export async function signOutEverywhere() {
  await verifyAdmin();
  const supabase = await createClient();
  // scope: 'global' revokes every refresh token for this user across
  // all devices, including this one — the caller redirects to /login
  // immediately after.
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw new Error(error.message);
}
