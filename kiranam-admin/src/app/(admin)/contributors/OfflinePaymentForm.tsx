'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { addOfflinePayment, type OfflinePaymentState } from './actions';
import { buttonSecondary, cardClass, inputClass } from '@/lib/ui';

const initialState: OfflinePaymentState = {};

// Records a cash/offline payment a volunteer collected in person — for when
// a contributor paid outside Razorpay and the payment still needs to count
// toward their history and any linked campaign total.
export function OfflinePaymentForm({ contributorId }: { contributorId: string }) {
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
    <form ref={formRef} action={formAction} className={`grid gap-3 ${cardClass} p-5 sm:grid-cols-3`}>
      <input name="amount" type="number" min="1" step="1" placeholder="Amount (₹)" required className={inputClass} />
      <input name="date" type="date" className={inputClass} />
      <input name="note" placeholder="Note (optional)" className={inputClass} />

      {state?.error && (
        <p className="text-sm text-kiranam-danger sm:col-span-3" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${buttonSecondary} sm:col-span-3`}>
        {pending ? 'Recording…' : 'Record Offline Payment'}
      </button>
    </form>
  );
}
