'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { createInvite, type InviteState } from './actions';
import { buttonPrimary, buttonSecondary, cardClass, inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

const initialState: InviteState = {};

// Submitting the same email again resends/refreshes an existing pending
// (or expired) invite in place — see createInvite. The invites table also
// has a per-row "Resend" action that calls this same path.
export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(createInvite, initialState);
  const lastState = useRef<InviteState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    setCopied(false);
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.warning) formRef.current?.reset();
  }, [state]);

  async function copyLink() {
    if (!state.signupUrl) return;
    try {
      await navigator.clipboard.writeText(state.signupUrl);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <div className={cn(cardClass, 'max-w-xl p-4')}>
      <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium text-kiranam-ink">
          Email address
          <input
            name="email"
            type="email"
            autoComplete="off"
            placeholder="name@example.org"
            required
            aria-describedby="invite-hint"
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? 'Sending invite…' : 'Send invite'}
        </button>
      </form>
      <p id="invite-hint" className="mt-2 text-xs text-kiranam-muted">
        They’ll get an email with a link to create their admin account. Invites expire after 7 days.
      </p>

      {state.error && (
        <p role="alert" className="mt-3 text-sm text-kiranam-danger">
          {state.error}
        </p>
      )}

      {state.warning && (
        <div role="alert" className="mt-3 rounded-lg border border-kiranam-warning/30 bg-kiranam-warning-soft p-3 text-sm text-kiranam-ink">
          <p className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-kiranam-warning" aria-hidden />
            {state.warning}
          </p>
          {state.signupUrl && (
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
              <code className="rounded bg-kiranam-surface px-2 py-1 text-xs">{state.signupUrl}</code>
              <button type="button" onClick={copyLink} className={cn(buttonSecondary, 'px-3 py-1.5 text-xs')}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
