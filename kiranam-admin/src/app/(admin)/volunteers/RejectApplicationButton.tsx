'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/lib/errors';
import { rejectApplication } from './actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buttonDanger, buttonSecondary, inputClass } from '@/lib/ui';

// Same reason-collecting dialog as PendingApplicantRow's reject flow, for
// the older per-applicant detail page — kept as a separate small client
// component (rather than teaching the generic ConfirmSubmitButton about
// free-text input) since collecting a reason is specific to rejection.
export function RejectApplicationButton({
  applicationId,
  profileId,
  applicantName,
}: {
  applicationId: string;
  profileId: string;
  applicantName: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    setOpen(false);
    const reasonToSend = reason;
    setReason('');
    startTransition(() => {
      toast.promise(rejectApplication(applicationId, profileId, reasonToSend), {
        loading: 'Rejecting…',
        success: 'Application rejected.',
        error: (err) => (err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.'),
      });
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={isPending} className={buttonSecondary}>
        Reject
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this application?</DialogTitle>
            <DialogDescription>
              {applicantName || 'This applicant'} will not be made a volunteer. They can reapply later.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label htmlFor="reject-reason-detail" className="text-xs font-semibold uppercase tracking-wide text-kiranam-muted">
              Rejection reason (optional)
            </label>
            <textarea
              id="reject-reason-detail"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Shown to the applicant…"
              className={`${inputClass} mt-1.5 resize-none`}
            />
          </div>

          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className={buttonSecondary}>
              Cancel
            </button>
            <button type="button" onClick={handleReject} disabled={isPending} className={buttonDanger}>
              Reject
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
