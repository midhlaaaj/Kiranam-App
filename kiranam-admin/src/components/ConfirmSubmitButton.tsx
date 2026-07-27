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
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setOpen(false);
    startTransition(() => {
      toast.promise(action(), {
        loading: pendingMessage,
        success: successMessage,
        error: (err) => (err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.'),
      });
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger disabled={isPending} className={className} aria-label={ariaLabel}>
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
