'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { sendAnnouncement, type SendState } from './actions';
import { buttonPrimary, cardClass, inputClass } from '@/lib/ui';
import { Form } from '@/components/Form';
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

const initialState: SendState = {};

// A sent push notification can't be recalled, so submitting is gated behind
// a confirm dialog rather than firing straight from the submit button — same
// reasoning as ConfirmSubmitButton, but this form still needs useActionState
// (for the title/body/audience fields + pending/error state), so the dialog
// intercepts the click and submits the form itself once confirmed.
export function NotificationsForm() {
  const [state, formAction, pending] = useActionState(sendAnnouncement, initialState);
  const lastState = useRef<SendState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) toast.success(state.message);
  }, [state]);

  function handleSendClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (formRef.current?.reportValidity()) setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <Form ref={formRef} action={formAction} className={`grid max-w-xl gap-3 ${cardClass} p-5`}>
      <input name="title" placeholder="Title" required className={inputClass} />
      <textarea name="body" placeholder="Message" required rows={4} className={inputClass} />
      <select name="audience" defaultValue="contributor" className={inputClass}>
        <option value="contributor">All Contributors</option>
        <option value="volunteer">All Volunteers</option>
      </select>

      {state?.error && <p className="text-sm text-kiranam-danger" role="alert">{state.error}</p>}

      <button type="submit" onClick={handleSendClick} disabled={pending} className={buttonPrimary}>
        {pending ? 'Sending…' : 'Send'}
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This push notification will be sent immediately to everyone in the selected audience and can&apos;t be
              unsent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
