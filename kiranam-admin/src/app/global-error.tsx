'use client';

import { useEffect } from 'react';

// Only fires for errors thrown in the root layout itself (error.tsx can't
// catch those, since it renders inside the layout). Must render its own
// <html>/<body> since the real root layout is what crashed. Deliberately
// plain — no dependency on globals.css/fonts/theme provider, since those
// are exactly the kind of thing that could be the cause of the crash.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ display: 'flex', minHeight: '100dvh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'system-ui, sans-serif', padding: '1.5rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: '0.25rem', maxWidth: '24rem', fontSize: '0.875rem', color: '#666' }}>
            The app ran into a problem loading this page. Try again, and if it keeps happening, let the dev team know.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{ borderRadius: '0.5rem', backgroundColor: '#111', color: '#fff', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
