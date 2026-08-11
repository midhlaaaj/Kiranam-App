'use client';

import { Suspense, useActionState, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updatePassword, establishResetSession, type ResetPasswordState } from './actions';
import { buttonPrimary, inputClass } from '@/lib/ui';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const initialState: ResetPasswordState = {};

const pageShell = (content: React.ReactNode) => (
  <div
    className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4"
    style={{ background: 'linear-gradient(160deg, #FF3B3B 0%, #EC2028 32%, #7A0D12 68%, #3D0709 100%)' }}
  >
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[65%]"
      style={{ background: 'radial-gradient(120% 90% at 30% -10%, rgba(255,140,140,0.5), transparent 70%)' }}
    />
    <div className="animate-count-in relative w-full max-w-sm rounded-lg bg-kiranam-surface p-8 shadow-elevation-lg">
      {content}
    </div>
  </div>
);

// access_token/refresh_token arrive as query params when /auth/confirm
// forwarded the session across hosts (see route.ts) — establish it via a
// Server Action before showing the form, then strip them from the URL so
// they don't linger in browser history or get resubmitted on refresh. No
// tokens in the URL just means an existing cookie session (or none, which
// updatePassword below already reports as an expired link).
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionState, setSessionState] = useState<'establishing' | 'ready' | 'error'>(
    searchParams.get('access_token') ? 'establishing' : 'ready'
  );

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    if (!accessToken || !refreshToken) return;

    establishResetSession(accessToken, refreshToken).then((result) => {
      setSessionState(result.error ? 'error' : 'ready');
      router.replace('/reset-password');
    });
  }, [searchParams, router]);

  if (sessionState === 'establishing') {
    return pageShell(
      <div className="flex flex-col items-center py-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-kiranam-primary" />
        <p className="mt-4 text-sm text-kiranam-muted">Verifying your reset link…</p>
      </div>
    );
  }

  if (sessionState === 'error') {
    return pageShell(
      <div className="text-center">
        <p className="text-4xl font-extrabold tracking-tight text-kiranam-primary">Kiranam</p>
        <p className="mt-5 text-sm font-semibold text-kiranam-ink">This reset link has expired</p>
        <p className="mt-2 text-sm text-kiranam-muted">Request a new one from the login page.</p>
      </div>
    );
  }

  return pageShell(
    <>
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
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
