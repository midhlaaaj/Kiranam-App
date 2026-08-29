'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signup, type SignupState } from './actions';
import { buttonPrimary, inputClass } from '@/lib/ui';
import { Eye, EyeOff } from 'lucide-react';

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);

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
          Create your admin account. You need to have been invited by an existing admin first.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-kiranam-ink">
              Full Name
            </label>
            <input id="fullName" name="fullName" type="text" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-kiranam-ink">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-kiranam-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                minLength={6}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer p-2 text-kiranam-muted hover:text-kiranam-ink"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {state?.error && <p className="text-sm text-kiranam-danger" role="alert">{state.error}</p>}

          <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-kiranam-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-kiranam-ink hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
