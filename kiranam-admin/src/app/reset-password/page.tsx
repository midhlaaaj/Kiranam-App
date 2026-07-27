'use client';

import { useActionState, useState } from 'react';
import { updatePassword, type ResetPasswordState } from './actions';
import { buttonPrimary, inputClass } from '@/lib/ui';
import { Eye, EyeOff } from 'lucide-react';

const initialState: ResetPasswordState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
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
        <p className="mt-4 text-sm text-kiranam-muted">Choose a new password for your admin account.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-kiranam-ink">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
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
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-kiranam-ink">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          {state?.error && <p className="text-sm text-kiranam-danger" role="alert">{state.error}</p>}

          <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
            {pending ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
