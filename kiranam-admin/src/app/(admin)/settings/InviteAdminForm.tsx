'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createInvite, type InviteState } from './actions';
import { buttonPrimary, cardClass, inputClass } from '@/lib/ui';

const initialState: InviteState = {};

// Submitting the same email again resends/refreshes an existing pending
// (or expired) invite in place rather than failing on the email's UNIQUE
// constraint — see createInvite. So there's no separate "Resend" action:
// re-typing the email here is how a resend happens.
export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(createInvite, initialState);
  const lastState = useRef<InviteState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={`flex max-w-md flex-col gap-2 sm:flex-row ${cardClass} p-4`}>
      <input name="email" type="email" placeholder="new-admin@email.com" required className={`${inputClass} min-w-0 flex-1`} />
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? 'Inviting…' : 'Invite'}
      </button>
    </form>
  );
}
