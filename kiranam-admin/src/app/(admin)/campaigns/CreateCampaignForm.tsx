'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createCampaign, type CreateCampaignState } from './actions';
import { buttonPrimary, inputClass } from '@/lib/ui';
import { Form } from '@/components/Form';
import { MediaManager } from '@/components/MediaManager';

const initialState: CreateCampaignState = {};

export function CreateCampaignForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(createCampaign, initialState);
  const lastState = useRef<CreateCampaignState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <Form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="c-title" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Title</label>
        <input id="c-title" name="title" required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-desc" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Description</label>
        <textarea id="c-desc" name="description" rows={3} className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-goal" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Goal (₹)</label>
        <input id="c-goal" name="goal" type="number" min="1" inputMode="numeric" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-raised" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Already raised (₹) <span className="font-normal text-kiranam-muted">— optional</span></label>
        <input id="c-raised" name="raised" type="number" min="0" inputMode="numeric" className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-end" className="mb-1.5 block text-sm font-medium text-kiranam-ink">End date <span className="font-normal text-kiranam-muted">— optional</span></label>
        <input id="c-end" name="end_date" type="date" className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">
          Photos <span className="font-normal text-kiranam-muted">— optional · the first photo is the cover</span>
        </label>
        <MediaManager />
      </div>

      {state?.error && <p className="text-sm text-kiranam-danger sm:col-span-2" role="alert">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${buttonPrimary} sm:col-span-2`}>
        {pending ? 'Creating…' : 'Create Campaign'}
      </button>
    </Form>
  );
}
