'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { registerContributor, type RegisterState } from './actions';
import { buttonPrimary, cardClass, inputClass } from '@/lib/ui';

const initialState: RegisterState = {};

// For a contributor who made an offline commitment (e.g. signed up at an
// event) but has never opened the app. Pre-creates their login so they can
// later "claim" it by simply signing in with the same phone number.
export function RegisterContributorForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(registerContributor, initialState);
  const lastState = useRef<RegisterState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form ref={formRef} action={formAction} className={`grid gap-3 ${cardClass} p-5 sm:grid-cols-2`}>
      <input name="full_name" placeholder="Full name" required className={`${inputClass} sm:col-span-2`} />
      <div className="relative sm:col-span-2">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-kiranam-muted">
          +91
        </span>
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit phone number"
          required
          maxLength={10}
          className={`${inputClass} pl-12`}
        />
      </div>
      <input
        name="monthly_amount"
        type="number"
        min="1"
        step="1"
        placeholder="Monthly amount (₹)"
        required
        className={inputClass}
      />
      {state?.error && (
        <p className="text-sm text-kiranam-danger sm:col-span-2" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${buttonPrimary} sm:col-span-2`}>
        {pending ? 'Registering…' : 'Register Contributor'}
      </button>
    </form>
  );
}
