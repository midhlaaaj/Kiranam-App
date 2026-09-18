'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/lib/errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/** Wraps a destructive server action in a confirm dialog + toast feedback.
 * Calls `action` directly (Server Actions are callable outside <form>), so no
 * surrounding <form> is needed at the call site. */
export function ConfirmSubmitButton({
  action,
  label,
  title,
  description,
  className,
  confirmLabel = 'Confirm',
  successMessage,
  pendingMessage = 'Working…',
  onSuccess,
  destructive = true,
  'aria-label': ariaLabel,
}: {
  action: () => Promise<void>;
  label: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  confirmLabel?: string;
  successMessage: string;
  pendingMessage?: string;
  /** Called after `action` resolves successfully — for callers that need to
   * do more than show a toast (reset a form, close a panel, etc). */
  onSuccess?: () => void;
  /** Styles the confirm button as destructive (red) — the default, since
   * this component is mostly used for delete/remove actions. Set false for
   * a confirm-gated action that isn't destructive (e.g. a role change). */
  destructive?: boolean;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setOpen(false);
    startTransition(() => {
      toast.promise(
        action().then((result) => {
          onSuccess?.();
          return result;
        }),
        {
          loading: pendingMessage,
          success: successMessage,
          error: (err) => (err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.'),
        }
      );
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {/* Explicit type="button" — this trigger renders a native <button> with
          no default type, so inside a <form> it would otherwise submit that
          form on click instead of opening the confirm dialog. */}
      <AlertDialogTrigger type="button" disabled={isPending} className={className} aria-label={ariaLabel}>
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={handleConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
