'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { addOfflinePayment, type OfflinePaymentState } from './actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buttonPrimary, buttonSecondary, inputClass } from '@/lib/ui';

const initialState: OfflinePaymentState = {};

interface CampaignOption {
  id: string;
  title: string;
}

// Records a cash/offline payment a volunteer collected in person — for when
// a contributor paid outside Razorpay and the payment still needs to count
// toward their history and any linked campaign total. Renders the history
// heading with a "Record payment" button; the form opens in a modal.
export function OfflinePaymentForm({
  contributorId,
  campaigns,
  paidThisMonth,
  contributorName,
}: {
  contributorId: string;
  campaigns: CampaignOption[];
  paidThisMonth: boolean;
  contributorName: string | null;
}) {
  const boundAction = addOfflinePayment.bind(null, contributorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const lastState = useRef<OfflinePaymentState>(initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) {
      toast.success(state.message);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close the form after a successful save
      setOpen(false);
    }
  }, [state]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Contribution history</h2>
        <button type="button" onClick={() => setOpen(true)} className={`${buttonSecondary} inline-flex items-center gap-1.5`}>
          <Plus size={15} aria-hidden /> Record payment
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record offline payment</DialogTitle>
            <DialogDescription>{contributorName || 'This contributor'} paid in person. It counts toward their history.</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-3 sm:grid-cols-2">
            {paidThisMonth && (
              <div className="flex items-start gap-2 rounded-lg border border-kiranam-warning/40 bg-kiranam-warning-soft px-3 py-2 text-xs text-kiranam-warning sm:col-span-2">
                <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
                <p>Already paid this month — this will add a second contribution.</p>
              </div>
            )}
            <label className="grid gap-1 text-xs font-medium text-kiranam-muted">
              Amount (₹)
              <input name="amount" type="number" min="1" step="1" required autoFocus className={inputClass} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-kiranam-muted">
              Date
              <input name="date" type="date" className={inputClass} />
            </label>
            {campaigns.length > 0 && (
              <label className="grid gap-1 text-xs font-medium text-kiranam-muted sm:col-span-2">
                For
                <select name="campaign_id" defaultValue="" className={inputClass}>
                  <option value="">Monthly commitment</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-xs font-medium text-kiranam-muted sm:col-span-2">
              Note (optional)
              <input name="note" className={inputClass} />
            </label>
            {state?.error && (
              <p className="text-sm text-kiranam-danger sm:col-span-2" role="alert">
                {state.error}
              </p>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setOpen(false)} className={buttonSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={pending} className={buttonPrimary}>
                {pending ? 'Recording…' : 'Record payment'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
