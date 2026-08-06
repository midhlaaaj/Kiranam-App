'use client';

import { useActionState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { addOfflinePayment, type OfflinePaymentState } from './actions';
import { buttonSecondary, cardClass, inputClass } from '@/lib/ui';

const initialState: OfflinePaymentState = {};

interface CampaignOption {
  id: string;
  title: string;
}

// Records a cash/offline payment a volunteer collected in person — for when
// a contributor paid outside Razorpay and the payment still needs to count
// toward their history and any linked campaign total.
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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={`grid gap-3 ${cardClass} p-5 sm:grid-cols-2`}>
      {paidThisMonth && (
        <div className="flex items-start gap-2 rounded-lg border border-kiranam-warning/40 bg-kiranam-warning-soft px-3.5 py-2.5 text-sm text-kiranam-warning sm:col-span-2">
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <p>{contributorName || 'This contributor'} already has a successful contribution recorded this month. Recording another will add a second one.</p>
        </div>
      )}

      <input name="amount" type="number" min="1" step="1" placeholder="Amount (₹)" required className={inputClass} />
      <input name="date" type="date" className={inputClass} />
      {campaigns.length > 0 && (
        <select name="campaign_id" defaultValue="" className={`${inputClass} sm:col-span-2`}>
          <option value="">General / monthly commitment</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              Campaign: {c.title}
            </option>
          ))}
        </select>
      )}
      <input name="note" placeholder="Note (optional)" className={`${inputClass} sm:col-span-2`} />

      {state?.error && (
        <p className="text-sm text-kiranam-danger sm:col-span-2" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${buttonSecondary} sm:col-span-2`}>
        {pending ? 'Recording…' : 'Record Offline Payment'}
      </button>
    </form>
  );
}
