'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Catches any error thrown while rendering a route (Server or Client
// Component) below the root layout. Without this, Next.js falls back to its
// own dev/prod error overlay — in production that's a bare "Application
// error" message with no way back, and in dev it's a full stack trace.
// Neither should reach an agent using the inbox/broadcasts/settings pages.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle size={28} strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This page ran into a problem. Try again, and if it keeps happening, let the team know.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
