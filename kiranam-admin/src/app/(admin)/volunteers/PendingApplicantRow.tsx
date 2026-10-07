'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { approveApplication, rejectApplication } from './actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonPrimary, buttonSecondary, inputClass, staggerDelay, tableCellClass, tableRowClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

export function PendingApplicantRow({
  applicant,
  index,
}: {
  applicant: {
    id: string;
    created_at: string;
    motivation: string | null;
    profiles: { id: string; full_name: string; phone: string | null } | null;
  };
  index: number;
}) {
  const [open, setOpen] = useState(false);
  // Rejecting is only undone by the applicant reapplying, so it gets its own
  // confirm step (which is also where the optional reason is written).
  // Approving is reversible (Demote) and fires straight from the review.
  const [confirmReject, setConfirmReject] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const profileId = applicant.profiles?.id;
  const name = applicant.profiles?.full_name || 'Unnamed applicant';

  function handleApprove() {
    if (!profileId) return;
    setOpen(false);
    startTransition(() => {
      toast.promise(approveApplication(applicant.id, profileId), {
        loading: 'Approving…',
        success: `${name} is now a volunteer.`,
        error: (err) => (err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.'),
      });
    });
  }

  function handleReject() {
    if (!profileId) return;
    setConfirmReject(false);
    setOpen(false);
    const reasonToSend = reason;
    setReason('');
    startTransition(() => {
      toast.promise(rejectApplication(applicant.id, profileId, reasonToSend), {
        loading: 'Rejecting…',
        success: 'Application rejected.',
        error: (err) => (err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.'),
      });
    });
  }

  return (
    <>
      <tr className={tableRowClass} style={staggerDelay(index)}>
        <td className={tableCellClass}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer text-left font-semibold text-kiranam-ink underline-offset-2 hover:underline"
          >
            {name}
          </button>
          <p className="text-xs tabular-nums text-kiranam-muted">{formatPhone(applicant.profiles?.phone)}</p>
        </td>
        <td className={cn(tableCellClass, 'hidden max-w-sm text-kiranam-muted md:table-cell')}>
          <p className="line-clamp-2">{applicant.motivation || '—'}</p>
        </td>
        <td className={cn(tableCellClass, 'whitespace-nowrap text-kiranam-muted')}>{formatDate(applicant.created_at)}</td>
        <td className={cn(tableCellClass, 'text-right')}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={isPending}
            className={cn(buttonSecondary, 'h-9 px-3.5 py-0')}
          >
            Review
          </button>
        </td>
      </tr>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              {formatPhone(applicant.profiles?.phone) || 'No phone on file'} · Applied {formatDate(applicant.created_at)}
            </DialogDescription>
          </DialogHeader>

          <div>
            <p className="text-sm font-medium text-kiranam-ink">Why they want to volunteer</p>
            <p className="mt-1.5 whitespace-pre-line text-sm text-kiranam-ink">{applicant.motivation || '—'}</p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmReject(true)}
              disabled={isPending}
              className={cn(buttonSecondary, 'text-kiranam-danger')}
            >
              Reject…
            </button>
            <button type="button" onClick={handleApprove} disabled={isPending} className={buttonPrimary}>
              Approve as volunteer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {name}’s application?</AlertDialogTitle>
            <AlertDialogDescription>They won’t become a volunteer, but they can apply again later.</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="grid gap-1.5 text-sm font-medium text-kiranam-ink">
            Reason <span className="font-normal text-kiranam-muted">(optional — shown to the applicant)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={cn(inputClass, 'resize-none font-normal')}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleReject}>
              Reject application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
