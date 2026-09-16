'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createCampaign, type CreateCampaignState } from './actions';
import { buttonPrimary, cardClass, inputClass } from '@/lib/ui';
import { Form } from '@/components/Form';
import { ImageCropField, COVER_CROP } from '@/components/ImageCropField';

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
    <Form ref={formRef} action={formAction} className={`grid gap-3 ${cardClass} p-5 sm:grid-cols-2`}>
      <input name="title" placeholder="Title" required className={`${inputClass} sm:col-span-2`} />
      <textarea name="description" placeholder="Description" className={`${inputClass} sm:col-span-2`} />
      <input name="goal" type="number" placeholder="Goal (₹)" required className={inputClass} />
      <input name="raised" type="number" placeholder="Already raised (₹, optional)" className={inputClass} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">End date (optional)</label>
        <input name="end_date" type="date" className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">Cover image (optional)</label>
        <ImageCropField name="cover" crop={COVER_CROP} />
      </div>

      {state?.error && <p className="text-sm text-kiranam-danger sm:col-span-2" role="alert">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${buttonPrimary} sm:col-span-2`}>
        {pending ? 'Creating…' : 'Create Campaign'}
      </button>
    </Form>
  );
}
