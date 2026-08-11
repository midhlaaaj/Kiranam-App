'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

// Landed on right after /auth/confirm has already verified the token and
// consumed it (verifyOtp is single-use — by the time we're here, that part
// is done). This page exists purely for the moment of feedback: a brief
// "Authenticating" state, then a green checkmark, then an attempt to hand
// off to the app via the kiranamapp:// deep link baked into `next`.
//
// The auto-redirect isn't guaranteed to fire — some in-app browsers (Mail's
// built-in Safari view, Gmail's webview) block JS-triggered custom-scheme
// navigation for security — so a manual "Open the app" button is always
// shown as the real fallback, not an edge case.
function VerifyingContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [stage, setStage] = useState<'authenticating' | 'verified'>('authenticating');

  useEffect(() => {
    const toVerified = setTimeout(() => setStage('verified'), 700);
    return () => clearTimeout(toVerified);
  }, []);

  useEffect(() => {
    if (stage !== 'verified' || !next) return;
    const toRedirect = setTimeout(() => {
      window.location.href = next;
    }, 700);
    return () => clearTimeout(toRedirect);
  }, [stage, next]);

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(160deg, #FF3B3B 0%, #EC2028 32%, #7A0D12 68%, #3D0709 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[65%]"
        style={{ background: 'radial-gradient(120% 90% at 30% -10%, rgba(255,140,140,0.5), transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm rounded-lg bg-kiranam-surface p-8 text-center shadow-elevation-lg">
        <p className="text-4xl font-extrabold tracking-tight text-kiranam-primary">Kiranam</p>

        <div className="mt-6 flex justify-center">
          {stage === 'authenticating' ? (
            <Loader2 className="h-10 w-10 animate-spin text-kiranam-primary" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-[#22A559]" />
          )}
        </div>

        <p className="mt-5 text-base font-semibold text-kiranam-ink">
          {stage === 'authenticating' ? 'Authenticating…' : 'Email verified'}
        </p>
        <p className="mt-2 text-sm text-kiranam-muted">
          {stage === 'authenticating'
            ? 'Hang tight while we confirm your email.'
            : 'Taking you back to the Kiranam app.'}
        </p>

        {stage === 'verified' && next && (
          <a
            href={next}
            className="mt-6 inline-block w-full rounded-full bg-kiranam-primary px-6 py-3 text-sm font-bold text-white"
          >
            Open the Kiranam app
          </a>
        )}
      </div>
    </div>
  );
}

export default function VerifyingPage() {
  return (
    <Suspense fallback={null}>
      <VerifyingContent />
    </Suspense>
  );
}
