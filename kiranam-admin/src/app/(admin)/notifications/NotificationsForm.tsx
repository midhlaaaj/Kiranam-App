'use client';

import { useActionState, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Plus, Send, X } from 'lucide-react';
import { sendAnnouncement, type Audience, type SendState } from './actions';
import { buttonPrimary, buttonSecondary, cardClass, inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';
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

// Lock-screen truncation is device-dependent; these are the points past which
// most phones start cutting text off, so the counter turns amber there.
const TITLE_SOFT = 50;
const TITLE_MAX = 80;
const BODY_SOFT = 150;
const BODY_MAX = 500;

const AUDIENCE_LABEL: Record<Audience, string> = { contributor: 'contributors', volunteer: 'volunteers', all: 'people' };
const AUDIENCE_OPTION: Record<Audience, string> = { contributor: 'Contributors', volunteer: 'Volunteers', all: 'All users' };

function Counter({ value, soft, max, id }: { value: string; soft: number; max: number; id: string }) {
  const over = value.length > soft;
  return (
    <span id={id} className={cn('text-xs tabular-nums', over ? 'text-kiranam-warning' : 'text-kiranam-muted')}>
      {value.length}/{max}
      {over && ' · may be cut off on lock screens'}
    </span>
  );
}

// A sent push can't be recalled, so submitting goes through a confirm dialog
// that states exactly who receives it. The dialog intercepts the click and
// submits the form itself once confirmed.
export function NotificationsForm({ counts }: { counts: Record<Audience, number> }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('contributor');
  const [retryIds, setRetryIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Collapsed by default — expands with "Send new".
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(async (prev: SendState, formData: FormData) => {
    const result = await sendAnnouncement(prev, formData);
    if (result.message) {
      toast.success(result.message);
      setOpen(false);
      setTitle('');
      setBody('');
      setRetryIds([]);
    } else {
      setRetryIds(result.failedIds ?? []);
      // React resets the form after the action; restore the draft.
      if (result.values) {
        setTitle(result.values.title);
        setBody(result.values.body);
        setAudience(result.values.audience);
      }
    }
    return result;
  }, initialState);

  const recipients = retryIds.length || counts[audience];
  const recipientText = `${recipients} ${AUDIENCE_LABEL[audience]}`;

  function openConfirm(e: React.MouseEvent<HTMLButtonElement>, retry: boolean) {
    e.preventDefault();
    if (!retry) setRetryIds([]);
    if (formRef.current?.reportValidity()) setConfirmOpen(true);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="announcement-composer"
        className={cn(open ? buttonSecondary : buttonPrimary)}
      >
        {open ? <X size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
        {open ? 'Close' : 'Send new'}
      </button>
      <div
        id="announcement-composer"
        hidden={!open}
        className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
      >
      <Form ref={formRef} action={formAction} className={cn(cardClass, 'grid gap-5 p-5')}>
        <div className="grid gap-1.5">
          <label htmlFor="ann-audience" className="text-sm font-medium text-kiranam-ink">
            Send to
          </label>
          <div className="relative max-w-xs">
            <select
              id="ann-audience"
              name="audience"
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as Audience);
                setRetryIds([]);
              }}
              className={cn(inputClass, 'cursor-pointer appearance-none pr-10')}
            >
              {(['contributor', 'volunteer', 'all'] as const).map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_OPTION[a]} ({counts[a].toLocaleString('en-IN')})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-kiranam-muted" aria-hidden />
          </div>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ann-title" className="text-sm font-medium text-kiranam-ink">
              Title
            </label>
            <Counter value={title} soft={TITLE_SOFT} max={TITLE_MAX} id="ann-title-count" />
          </div>
          <input
            id="ann-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            required
            aria-describedby="ann-title-count"
            placeholder="e.g. Onam kit drive starts Monday"
            className={inputClass}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ann-body" className="text-sm font-medium text-kiranam-ink">
              Message
            </label>
            <Counter value={body} soft={BODY_SOFT} max={BODY_MAX} id="ann-body-count" />
          </div>
          <textarea
            id="ann-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            required
            rows={4}
            aria-describedby="ann-body-count"
            className={cn(inputClass, 'resize-y')}
          />
        </div>

        <input type="hidden" name="retryIds" value={retryIds.join(',')} />

        {state?.error && (
          <div role="alert" className="rounded-lg border border-kiranam-danger/30 bg-kiranam-danger-soft p-3 text-sm text-kiranam-ink">
            <p>{state.error}</p>
            {retryIds.length > 0 && (
              <button
                type="submit"
                onClick={(e) => openConfirm(e, true)}
                disabled={pending}
                className={cn(buttonSecondary, 'mt-2 px-3.5 py-2')}
              >
                Retry the {retryIds.length} that failed
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            onClick={(e) => openConfirm(e, false)}
            disabled={pending || counts[audience] === 0}
            className={buttonPrimary}
          >
            <Send size={16} aria-hidden />
            {pending ? 'Sending…' : `Send to ${counts[audience].toLocaleString('en-IN')} ${AUDIENCE_LABEL[audience]}`}
          </button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send to {recipientText}?</AlertDialogTitle>
              <AlertDialogDescription>
                “{title}” will arrive as a push notification on their phones right away. It can’t be unsent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmOpen(false);
                  formRef.current?.requestSubmit();
                }}
              >
                Send now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Form>

      <aside aria-label="Preview" className="hidden lg:block">
        <p className="mb-2 text-sm font-medium text-kiranam-ink">Preview</p>
        <div className="rounded-3xl bg-kiranam-ink p-3 pt-8 shadow-elevation-md">
          <div className="rounded-2xl bg-white/95 p-3 shadow-elevation-sm">
            <div className="flex items-center gap-2 text-[11px] text-kiranam-muted">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-kiranam-primary text-[9px] font-bold text-white" aria-hidden>
                K
              </span>
              KIRANAM · now
            </div>
            <p className="mt-1.5 line-clamp-1 text-sm font-semibold text-kiranam-ink">{title || 'Your title'}</p>
            <p className="line-clamp-3 text-sm text-kiranam-ink">{body || 'Your message appears here.'}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-kiranam-muted">Roughly how it looks on a lock screen. Long text gets cut off.</p>
      </aside>
      </div>
    </div>
  );
}
