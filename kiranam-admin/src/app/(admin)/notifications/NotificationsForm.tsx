'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { sendAnnouncement, type SendState } from './actions';
import { buttonPrimary, cardClass, inputClass } from '@/lib/ui';

const initialState: SendState = {};

export function NotificationsForm() {
  const [state, formAction, pending] = useActionState(sendAnnouncement, initialState);
  const lastState = useRef<SendState>(initialState);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className={`grid max-w-xl gap-3 ${cardClass} p-5`}>
      <input name="title" placeholder="Title" required className={inputClass} />
      <textarea name="body" placeholder="Message" required rows={4} className={inputClass} />
      <select name="audience" defaultValue="contributor" className={inputClass}>
        <option value="contributor">All Contributors</option>
        <option value="volunteer">All Volunteers</option>
      </select>

      {state?.error && <p className="text-sm text-kiranam-danger" role="alert">{state.error}</p>}

      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
