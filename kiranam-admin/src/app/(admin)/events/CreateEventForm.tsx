'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createEvent, type CreateEventState } from './actions';
import { buttonPrimary, cardClass, inputClass } from '@/lib/ui';
import { Form } from '@/components/Form';
import { ImageCropField, COVER_CROP } from '@/components/ImageCropField';

const initialState: CreateEventState = {};

export function CreateEventForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(createEvent, initialState);
  const lastState = useRef<CreateEventState>(initialState);
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
      <input name="event_date" type="date" required className={inputClass} />
      <input name="time_label" placeholder="Time (e.g. 9:00 AM – 1:00 PM)" className={inputClass} />
      <input name="location" placeholder="Location" required className={`${inputClass} sm:col-span-2`} />
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">Cover image (optional)</label>
        <ImageCropField name="cover" crop={COVER_CROP} />
      </div>

      {state?.error && <p className="text-sm text-kiranam-danger sm:col-span-2" role="alert">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${buttonPrimary} sm:col-span-2`}>
        {pending ? 'Creating…' : 'Create Event'}
      </button>
    </Form>
  );
}
