'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { buttonPrimary } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** Submit button that disables itself and shows progress while the parent
 * <form>'s action runs (uploads can take a few seconds — no double submits). */
export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn(buttonPrimary, className)}>
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </button>
  );
}
