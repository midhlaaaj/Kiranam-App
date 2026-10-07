'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { resendInvite } from '../actions';

export function ResendInviteButton({ inviteId, email }: { inviteId: string; email: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resendInvite(inviteId);
          if (result.error) toast.error(result.error);
          else if (result.warning) toast.warning(result.warning, { duration: 10000 });
          else toast.success(result.message ?? `Invite resent to ${email}.`);
        })
      }
      className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-kiranam-ink transition hover:bg-kiranam-surface-alt disabled:cursor-wait disabled:opacity-60"
    >
      <Send size={14} strokeWidth={2.25} aria-hidden />
      {pending ? 'Resending…' : 'Resend'}
    </button>
  );
}
