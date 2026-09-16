'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/min';
import { registerContributor, type RegisterState } from './actions';
import { buttonPrimary, cardClass } from '@/lib/ui';
import { COUNTRIES } from '@/lib/countries';
import { validatePhoneNumber } from '@/lib/phone';

const initialState: RegisterState = {};

const fieldLabelClass = 'text-xs font-semibold text-kiranam-muted';

// Bare, unstyled focus ring for the native select/input so keyboard focus is
// still visible without redrawing the whole control — the visual border/ring
// treatment lives on the wrapper div instead (see phone group + select below).
const nativeControlClass =
  'w-full bg-transparent text-sm text-kiranam-ink placeholder:text-kiranam-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

// For a contributor who made an offline commitment (e.g. signed up at an
// event) but has never opened the app. Pre-creates their login by phone
// number — they claim it just by logging into kiranam-app with this same
// number and completing the normal phone-OTP flow, same as anyone else.
export function RegisterContributorForm({
  onDone,
  autoAssignKkNumber,
}: {
  onDone?: () => void;
  autoAssignKkNumber: boolean;
}) {
  const [state, formAction, pending] = useActionState(registerContributor, initialState);
  const lastState = useRef<RegisterState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [dialCode, setDialCode] = useState('91');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  const country = useMemo(() => COUNTRIES.find((c) => c.dialCode === dialCode), [dialCode]);
  const phoneError = useMemo(
    () => (phoneTouched && country ? validatePhoneNumber(phone, country.iso2 as CountryCode) : null),
    [phoneTouched, country, phone]
  );

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
      setPhone('');
      setDialCode('91');
      setPhoneTouched(false);
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        setPhoneTouched(true);
        if (!country || validatePhoneNumber(phone, country.iso2 as CountryCode)) e.preventDefault();
      }}
      className={`${cardClass} p-5`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-kiranam-ink">Register contributor</h3>
        <p className="mt-0.5 text-xs text-kiranam-muted">
          For someone who signed up in person. They&apos;ll claim this by logging into the app with the same
          phone number.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="full_name" className={fieldLabelClass}>
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            placeholder="e.g. Anjali Menon"
            required
            className="w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none"
          />
        </div>

        <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
          <legend className={`${fieldLabelClass} mb-1.5 float-left w-full p-0`}>Phone number</legend>
          <div
            className={`flex overflow-hidden rounded-lg border bg-kiranam-surface transition duration-150 ${
              phoneError
                ? 'border-kiranam-danger'
                : 'border-kiranam-border-strong focus-within:border-kiranam-primary'
            }`}
          >
            <div className="relative flex shrink-0 items-stretch border-r border-kiranam-border-strong">
              <select
                name="dial_code"
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                aria-label="Country code"
                className={`${nativeControlClass} w-[5.75rem] cursor-pointer appearance-none py-2.5 pl-3.5 pr-7`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.iso2} value={c.dialCode}>
                    {c.iso2} +{c.dialCode}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-kiranam-muted"
              />
            </div>
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              placeholder="98471 85479"
              required
              maxLength={15}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))}
              onBlur={() => setPhoneTouched(true)}
              aria-label="Phone number"
              aria-invalid={!!phoneError}
              aria-describedby={phoneError ? 'phone-error' : undefined}
              className={`${nativeControlClass} min-w-0 flex-1 px-3.5 py-2.5`}
            />
          </div>
          {phoneError && (
            <p id="phone-error" className="text-xs text-kiranam-danger" role="alert">
              {phoneError}
            </p>
          )}
        </fieldset>

        {!autoAssignKkNumber && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="kk_number" className={fieldLabelClass}>
              KK number
            </label>
            <input
              id="kk_number"
              name="kk_number"
              placeholder="e.g. KK2001"
              required
              className="w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="monthly_amount" className={fieldLabelClass}>
            Monthly amount <span className="font-normal text-kiranam-muted-2">— optional</span>
          </label>
          <div className="flex items-center rounded-lg border border-kiranam-border-strong bg-kiranam-surface pl-3.5 transition duration-150 focus-within:border-kiranam-primary">
            <span aria-hidden className="text-sm text-kiranam-muted">
              ₹
            </span>
            <input
              id="monthly_amount"
              name="monthly_amount"
              type="number"
              min="1"
              step="1"
              placeholder="500"
              className={`no-spinner ${nativeControlClass} px-2 py-2.5`}
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 text-sm text-kiranam-danger" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${buttonPrimary} mt-5 w-full`}>
        {pending ? 'Registering…' : 'Register Contributor'}
      </button>
    </form>
  );
}
