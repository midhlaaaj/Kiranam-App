'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { registerContributor, type RegisterState } from './actions';
import { buttonPrimary, cardClass, inputClass } from '@/lib/ui';
import { COUNTRIES } from '@/lib/countries';

const initialState: RegisterState = {};

// For a contributor who made an offline commitment (e.g. signed up at an
// event) but has never opened the app. Pre-creates their login by phone
// number — they claim it just by logging into kiranam-app with this same
// number and completing the normal phone-OTP flow, same as anyone else.
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
      <div className="flex gap-2 sm:col-span-2">
        <select
          name="dial_code"
          defaultValue="91"
          aria-label="Country code"
          className={`${inputClass} w-[6.5rem] shrink-0`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso2} value={c.dialCode}>
              {c.flag} +{c.dialCode}
            </option>
          ))}
        </select>
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="Phone number"
          required
          maxLength={15}
          className={`${inputClass} flex-1`}
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
