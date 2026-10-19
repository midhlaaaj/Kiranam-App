'use server';

import { redirect } from 'next/navigation';
import { findValidInvite } from '@/lib/adminInvite';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SignupState {
  error?: string;
}

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const token = String(formData.get('token') || '');
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('fullName') || '').trim();

  if (!password) {
    return { error: 'Enter a password.' };
  }

  // The secret code from the emailed link is what authorises sign-up. The
  // email comes from the invite itself — never from the form — so knowing
  // an invited address isn't enough to claim it.
  const invite = await findValidInvite(token);
  if (!invite) {
    return { error: 'This invite link is no longer valid. Ask an admin to send you a new one.' };
  }
  const email = invite.email.toLowerCase();

  // Invited admins are trusted (the invite itself is the verification
  // step), so create the user pre-confirmed rather than sending a
  // confirmation email via the normal signUp flow.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId = data?.user?.id;
  if (error) {
    const alreadyExists =
      (error as { code?: string }).code === 'email_exists' || /already (been )?registered/i.test(error.message);
    if (!alreadyExists) return { error: error.message };

    // A previously revoked admin: their login still exists, so instead of
    // creating one, set the password they just chose and promote them
    // again. The valid invite (checked above) is what authorises this.
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`))
      .maybeSingle();
    if (!existing) {
      return { error: "We couldn't set up this account. Ask the admin who invited you to send a new invite." };
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) return { error: updateError.message };

    // New accounts are promoted by the on-confirm trigger; this account is
    // already confirmed, so run the same promotion (marks the invite used
    // and sets role = 'admin') directly.
    const { error: promoteError } = await admin.rpc('promote_if_invited', { p_user_id: existing.id, p_email: email });
    if (promoteError) return { error: promoteError.message };
    userId = existing.id;
  }

  if (userId && fullName) {
    await admin.from('profiles').update({ full_name: fullName }).eq('id', userId);
  }

  // Single use: the code can't be replayed once the account exists.
  await admin.from('admin_invites').update({ token_hash: null }).eq('id', invite.id);

  redirect('/login');
}
