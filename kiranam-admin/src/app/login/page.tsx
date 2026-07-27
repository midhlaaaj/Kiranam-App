'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { login, type LoginState } from './actions';
import { buttonPrimary, inputClass } from '@/lib/ui';
import { Eye, EyeOff } from 'lucide-react';

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
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
        <p className="mt-4 text-sm text-kiranam-muted">Sign in with your admin account.</p>

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
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-kiranam-ink">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-kiranam-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-kiranam-muted hover:text-kiranam-ink cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {state?.error && <p className="text-sm text-kiranam-danger" role="alert">{state.error}</p>}

          <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-kiranam-muted">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-kiranam-ink hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
