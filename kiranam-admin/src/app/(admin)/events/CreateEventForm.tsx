'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createEvent, type CreateEventState } from './actions';
import { buttonPrimary, inputClass } from '@/lib/ui';
import { Form } from '@/components/Form';
import { MediaManager } from '@/components/MediaManager';

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
    <Form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="e-title" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Title</label>
        <input id="e-title" name="title" required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="e-desc" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Description</label>
        <textarea id="e-desc" name="description" rows={3} className={inputClass} />
      </div>
      <div>
        <label htmlFor="e-date" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Date</label>
        <input id="e-date" name="event_date" type="date" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="e-time" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Time <span className="font-normal text-kiranam-muted">— optional</span></label>
        <input id="e-time" name="time_label" placeholder="e.g. 9:00 AM – 1:00 PM" className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="e-loc" className="mb-1.5 block text-sm font-medium text-kiranam-ink">Location</label>
        <input id="e-loc" name="location" required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">
          Photos <span className="font-normal text-kiranam-muted">— optional · the first photo is the cover</span>
        </label>
        <MediaManager />
      </div>

      {state?.error && <p className="text-sm text-kiranam-danger sm:col-span-2" role="alert">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${buttonPrimary} sm:col-span-2`}>
        {pending ? 'Creating…' : 'Create Event'}
      </button>
    </Form>
  );
}
