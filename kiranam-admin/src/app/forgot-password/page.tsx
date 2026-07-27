'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordReset, type ForgotPasswordState } from './actions';
import { buttonPrimary, inputClass } from '@/lib/ui';

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(160deg, #FF3B3B 0%, #EC2028 32%, #7A0D12 68%, #3D0709 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[65%]"
        style={{ background: 'radial-gradient(120% 90% at 30% -10%, rgba(255,140,140,0.5), transparent 70%)' }}
      />

      <div className="animate-count-in relative w-full max-w-sm rounded-lg bg-kiranam-surface p-8 shadow-elevation-lg">
        <p className="text-4xl font-extrabold tracking-tight text-kiranam-primary">Kiranam</p>
        <p className="mt-4 text-sm text-kiranam-muted">
          Enter your admin email and we&apos;ll send a link to reset your password.
        </p>

        {state?.message ? (
          <p className="mt-6 text-sm text-kiranam-ink" role="status">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-kiranam-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            {state?.error && <p className="text-sm text-kiranam-danger" role="alert">{state.error}</p>}

            <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-kiranam-muted">
          <Link href="/login" className="font-semibold text-kiranam-ink hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
