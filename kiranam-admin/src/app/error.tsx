'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { buttonPrimary } from '@/lib/ui';

// Catches any error thrown while rendering a route (Server or Client
// Component) below the root layout. Without this, Next.js falls back to its
// own dev/prod error overlay — in production that's a bare "Application
// error: a client-side exception has occurred" with no way back, and in dev
// it's a full stack trace. Neither is something an admin should ever see.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-kiranam-danger-soft p-3 text-kiranam-danger">
        <AlertTriangle size={28} strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-lg font-bold text-kiranam-ink">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-kiranam-muted">
          This page ran into a problem. Try again, and if it keeps happening, let the dev team know.
        </p>
      </div>
      <button type="button" onClick={reset} className={buttonPrimary}>
        Try again
      </button>
    </div>
  );
}
