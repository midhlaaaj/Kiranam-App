'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/min';
import { registerVolunteer, upgradeContributorToVolunteer, type RegisterVolunteerState } from './actions';
import { checkPhoneDuplicate, type PhoneDuplicateMatch } from '@/lib/phoneDuplicateActions';
import { buttonPrimary, buttonSecondary, cardClass } from '@/lib/ui';
import { COUNTRIES } from '@/lib/countries';
import { validatePhoneNumber } from '@/lib/phone';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';

const initialState: RegisterVolunteerState = {};

const fieldLabelClass = 'text-xs font-semibold text-kiranam-muted';

const nativeControlClass =
  'w-full bg-transparent text-sm text-kiranam-ink placeholder:text-kiranam-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

// For a volunteer recruited offline (before this system existed, or outside
// the in-app application flow) but who has never opened the app. Pre-creates
// their login by phone number — they claim it just by logging into
// kiranam-app with this same number. Any contributors already assigned to
// them offline are added afterwards from this volunteer's detail page.
export function RegisterVolunteerForm({
  onDone,
  onEditExisting,
}: {
  onDone?: () => void;
  /** Called instead of opening a quick-view modal locally, so the caller can
   * close this registration panel first (it would otherwise unmount along
   * with any modal it rendered itself, since it's the AddNewPanel's content). */
  onEditExisting: (match: PhoneDuplicateMatch) => void;
}) {
  const [state, formAction, pending] = useActionState(registerVolunteer, initialState);
  const lastState = useRef<RegisterVolunteerState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [dialCode, setDialCode] = useState('91');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  const country = useMemo(() => COUNTRIES.find((c) => c.dialCode === dialCode), [dialCode]);
  const phoneError = useMemo(
    () => (phoneTouched && country ? validatePhoneNumber(phone, country.iso2 as CountryCode) : null),
    [phoneTouched, country, phone]
  );

  // Checked on phone-field blur — before the rest of the form is filled in,
  // rather than only on submit. A single request rather than one per
  // keystroke, since the backend runs on a free tier. A contributor match
  // offers "upgrade to volunteer"; a volunteer match offers a quick view/edit
  // — same as on the Contributors registration form.
  const [duplicate, setDuplicate] = useState<PhoneDuplicateMatch | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
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
    // Submit-time fallback (a duplicate created between the blur check and
    // submit) — surfaces the same upgrade banner as the earlier client check.
    if (state.existingContributor) {
      setDuplicate({ id: state.existingContributor.id, fullName: state.existingContributor.fullName, role: 'contributor' });
    }
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
      setPhone('');
      setDialCode('91');
      setPhoneTouched(false);
      setDuplicate(null);
      onDone?.();
    }
  }, [state, onDone]);

  function resetAfterUpgrade() {
    formRef.current?.reset();
    setPhone('');
    setDialCode('91');
    setPhoneTouched(false);
    setDuplicate(null);
    onDone?.();
  }

  return (
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
        <h3 className="text-sm font-semibold text-kiranam-ink">Register volunteer</h3>
        <p className="mt-0.5 text-xs text-kiranam-muted">
          For someone recruited offline. They&apos;ll claim this by logging into the app with the same phone
          number. Assign their contributors afterwards from their volunteer page.
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
              aria-describedby={phoneError ? 'v-phone-error' : undefined}
              className={`${nativeControlClass} min-w-0 flex-1 px-3.5 py-2.5`}
            />
          </div>
          {phoneError && (
            <p id="v-phone-error" className="text-xs text-kiranam-danger" role="alert">
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
            {duplicate.role === 'contributor' && (
              <ConfirmSubmitButton
                action={async () => {
                  const kkNumberInput = String(new FormData(formRef.current ?? undefined).get('kk_number') || '');
                  await upgradeContributorToVolunteer(duplicate.id, kkNumberInput);
                }}
                label="Upgrade to volunteer"
                title="Upgrade to volunteer?"
                description={`${duplicate.fullName || 'This contributor'} will become a volunteer and keep their existing contributor history. This can be reversed later.`}
                confirmLabel="Upgrade"
                pendingMessage="Upgrading…"
                successMessage={`${duplicate.fullName || 'Contributor'} has been upgraded to volunteer.`}
                onSuccess={resetAfterUpgrade}
                destructive={false}
                className={`${buttonSecondary} shrink-0`}
              />
            )}
            {duplicate.role === 'volunteer' && (
              <button type="button" onClick={() => onEditExisting(duplicate)} className={`${buttonSecondary} shrink-0`}>
                Edit profile
              </button>
            )}
          </div>
        )}

        {!duplicate && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="v_full_name" className={fieldLabelClass}>
              Full name
            </label>
            <input
              id="v_full_name"
              name="full_name"
              placeholder="Enter full name"
              required
              className="w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none"
            />
          </div>
        )}

        {(!duplicate || duplicate.role === 'contributor') && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="v_kk_number" className={fieldLabelClass}>
              KK number <span className="font-normal text-kiranam-muted-2">— optional</span>
            </label>
            <input
              id="v_kk_number"
              name="kk_number"
              placeholder="e.g. KK1"
              className="w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      {state?.error && (
        <p className="mt-4 text-sm text-kiranam-danger" role="alert">
          {state.error}
        </p>
      )}

      {!duplicate && (
        <button type="submit" disabled={pending} className={`${buttonPrimary} mt-5 w-full`}>
          {pending ? 'Registering…' : 'Register Volunteer'}
        </button>
      )}
    </form>
  );
}
