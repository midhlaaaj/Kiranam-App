'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/min';
import { getAutoAssignKkNumberSetting, getVolunteersForAssignment, registerContributor, type RegisterState } from './actions';
import { checkPhoneDuplicate, type PhoneDuplicateMatch } from '@/lib/phoneDuplicateActions';
import { buttonPrimary, buttonSecondary, cardClass } from '@/lib/ui';
import { COUNTRIES } from '@/lib/countries';
import { validatePhoneNumber } from '@/lib/phone';
import { PersonCombobox } from '@/components/PersonCombobox';
import { ContributorQuickViewModal } from './ContributorQuickViewModal';
import { VolunteerQuickViewModal } from '../volunteers/VolunteerQuickViewModal';

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
export function RegisterContributorForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(registerContributor, initialState);
  const lastState = useRef<RegisterState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [dialCode, setDialCode] = useState('91');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Fetched on mount instead of being passed down from the Contributors page
  // (a Server Component) — that page no longer awaits this DB round-trip
  // itself so its title/toolbar can render immediately. The modal starts
  // closed, so this resolves well before anyone actually sees the form.
  const [autoAssignKkNumber, setAutoAssignKkNumber] = useState(false);
  useEffect(() => {
    getAutoAssignKkNumberSetting().then(setAutoAssignKkNumber).catch(() => {});
  }, []);

  const [volunteers, setVolunteers] = useState<{ id: string; full_name: string | null; phone: string | null }[]>([]);
  useEffect(() => {
    getVolunteersForAssignment().then(setVolunteers).catch(() => {});
  }, []);

  // PersonCombobox tracks its own selection internally rather than through
  // the (uncontrolled) form, so formRef.current?.reset() below can't clear
  // it — remounting via this key can.
  const [comboboxResetKey, setComboboxResetKey] = useState(0);

  const country = useMemo(() => COUNTRIES.find((c) => c.dialCode === dialCode), [dialCode]);
  const phoneError = useMemo(
    () => (phoneTouched && country ? validatePhoneNumber(phone, country.iso2 as CountryCode) : null),
    [phoneTouched, country, phone]
  );

  // Checked as soon as the phone number is entered — before the admin fills
  // in the rest of the form — rather than only surfacing on submit, which
  // used to mean a duplicate was only caught after everything was filled in.
  const [duplicate, setDuplicate] = useState<PhoneDuplicateMatch | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const checkSeq = useRef(0);

  async function checkDuplicate() {
    if (!country || validatePhoneNumber(phone, country.iso2 as CountryCode)) {
      setDuplicate(null);
      return;
    }
    const seq = ++checkSeq.current;
    setCheckingDuplicate(true);
    try {
      const match = await checkPhoneDuplicate(dialCode, phone);
      if (seq === checkSeq.current) setDuplicate(match);
    } catch {
      // Non-blocking — registration will still catch a real duplicate on submit.
    } finally {
      if (seq === checkSeq.current) setCheckingDuplicate(false);
    }
  }

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
      setComboboxResetKey((k) => k + 1);
      setDuplicate(null);
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <>
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        setPhoneTouched(true);
        if (!country || validatePhoneNumber(phone, country.iso2 as CountryCode) || duplicate) e.preventDefault();
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
                onChange={(e) => {
                  setDialCode(e.target.value);
                  setDuplicate(null);
                }}
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
              placeholder="0000000000"
              required
              maxLength={15}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^\d ]/g, ''));
                setDuplicate(null);
              }}
              onBlur={() => {
                setPhoneTouched(true);
                checkDuplicate();
              }}
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
          {checkingDuplicate && <p className="text-xs text-kiranam-muted">Checking…</p>}
        </fieldset>

        {duplicate && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kiranam-border-strong bg-kiranam-surface-alt px-3.5 py-2.5 sm:col-span-2">
            <p className="text-sm text-kiranam-ink">
              {duplicate.fullName || 'Someone'} is already registered with this number as a{' '}
              {duplicate.role === 'admin' ? 'staff account' : duplicate.role}.
            </p>
            {duplicate.role !== 'admin' && (
              <button
                type="button"
                onClick={() => setQuickViewId(duplicate.id)}
                className={`${buttonSecondary} shrink-0`}
              >
                Edit profile
              </button>
            )}
          </div>
        )}

        {!duplicate && (
          <>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="full_name" className={fieldLabelClass}>
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                placeholder="Enter full name"
                required
                className="w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none"
              />
            </div>

            {!autoAssignKkNumber && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="kk_number" className={fieldLabelClass}>
                  KK number
                </label>
                <input
                  id="kk_number"
                  name="kk_number"
                  placeholder="e.g. KK1"
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

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={fieldLabelClass}>
                Assign volunteer <span className="font-normal text-kiranam-muted-2">— optional</span>
              </label>
              <PersonCombobox
                key={comboboxResetKey}
                people={volunteers}
                name="volunteerId"
                placeholder="Search volunteers by name or phone…"
                emptyLabel="No volunteers match."
              />
            </div>
          </>
        )}
      </div>

      {state?.error && (
        <p className="mt-4 text-sm text-kiranam-danger" role="alert">
          {state.error}
        </p>
      )}

      {!duplicate && (
        <button type="submit" disabled={pending} className={`${buttonPrimary} mt-5 w-full`}>
          {pending ? 'Registering…' : 'Register Contributor'}
        </button>
      )}
    </form>

    {duplicate?.role === 'contributor' && (
      <ContributorQuickViewModal contributorId={quickViewId} onClose={() => setQuickViewId(null)} initialEditing />
    )}
    {duplicate?.role === 'volunteer' && (
      <VolunteerQuickViewModal volunteerId={quickViewId} onClose={() => setQuickViewId(null)} initialEditing />
    )}
    </>
  );
}
