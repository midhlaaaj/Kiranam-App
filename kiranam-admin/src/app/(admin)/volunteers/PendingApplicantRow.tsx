'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/lib/errors';
import { approveApplication, rejectApplication } from './actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buttonDanger, buttonPrimary, inputClass, staggerDelay, tableCellClass, tableRowClass } from '@/lib/ui';

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
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const profileId = applicant.profiles?.id;

  function handleApprove() {
    if (!profileId) return;
    setOpen(false);
    startTransition(() => {
      toast.promise(approveApplication(applicant.id, profileId), {
        loading: 'Approving…',
        success: 'Application approved.',
        error: (err) => (err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.'),
      });
    });
  }

  function handleReject() {
    if (!profileId) return;
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
      <tr
        className={`${tableRowClass} cursor-pointer`}
        style={staggerDelay(index)}
        onClick={() => setOpen(true)}
      >
        <td className={tableCellClass}>
          <span className="font-semibold text-kiranam-ink">{applicant.profiles?.full_name || 'Unnamed'}</span>
        </td>
        <td className={`${tableCellClass} text-kiranam-muted`}>{applicant.profiles?.phone}</td>
        <td className={`${tableCellClass} text-kiranam-muted`}>
          {new Date(applicant.created_at).toLocaleDateString('en-IN')}
        </td>
      </tr>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{applicant.profiles?.full_name || 'Unnamed'}</DialogTitle>
            <DialogDescription>{applicant.profiles?.phone}</DialogDescription>
          </DialogHeader>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-kiranam-muted">Motivation</p>
            <p className="mt-1.5 text-sm text-kiranam-ink/80">{applicant.motivation || '—'}</p>
          </div>

          <div>
            <label htmlFor={`reject-reason-${applicant.id}`} className="text-xs font-semibold uppercase tracking-wide text-kiranam-muted">
              Rejection reason (optional)
            </label>
            <textarea
              id={`reject-reason-${applicant.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Shown to the applicant if you reject this application…"
              className={`${inputClass} mt-1.5 resize-none`}
            />
          </div>

          <DialogFooter>
            <button type="button" onClick={handleReject} disabled={isPending} className={buttonDanger}>
              Reject
            </button>
            <button type="button" onClick={handleApprove} disabled={isPending} className={buttonPrimary}>
              Approve
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
