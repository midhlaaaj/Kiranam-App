'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { recordManualContribution, type OfflinePaymentState } from './actions';
import { Modal } from '@/components/Modal';
import { buttonPrimary, inputClass } from '@/lib/ui';

const initialState: OfflinePaymentState = {};

interface ContributorOption {
  id: string;
  full_name: string | null;
  phone: string | null;
  monthlyAmount: number | null;
  paidThisMonth: boolean;
}

interface CampaignOption {
  id: string;
  title: string;
}

function formatMoney(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}

/** Records an offline/manual payment for any contributor, from the global
 * Contributions list — same underlying action as a contributor's own
 * "Record Offline Payment" form, just with a contributor picker up front
 * since this page isn't scoped to one contributor. */
export function ManualContributionButton({
  contributors,
  campaigns,
}: {
  contributors: ContributorOption[];
  campaigns: CampaignOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ContributorOption | null>(null);
  const [state, formAction, pending] = useActionState(recordManualContribution, initialState);
  const lastState = useRef<OfflinePaymentState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.error) toast.error(state.error);
    if (state.message) {
      toast.success(state.message);
      close();
    }
  }, [state]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return contributors
      .filter((c) => (c.full_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q))
      .slice(0, 8);
  }, [contributors, query]);

  function close() {
    setOpen(false);
    setQuery('');
    setSelected(null);
    formRef.current?.reset();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonPrimary}>
        <Plus size={16} strokeWidth={2.25} />
        Record Manual Contribution
      </button>

      <Modal open={open} onClose={close} title="Record Manual Contribution">
        <form ref={formRef} action={formAction} className="grid gap-3">
          <input type="hidden" name="contributor_id" value={selected?.id || ''} />

          {selected ? (
            <div className="rounded-lg border border-kiranam-border-strong bg-kiranam-surface-alt px-3.5 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-kiranam-ink">{selected.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-kiranam-muted">{selected.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="cursor-pointer text-xs font-semibold text-kiranam-primary hover:underline"
                >
                  Change
                </button>
              </div>
              <p className="mt-1.5 text-xs text-kiranam-muted">
                Monthly commitment: {selected.monthlyAmount ? formatMoney(selected.monthlyAmount) : 'Not set'}
              </p>
            </div>
          ) : null}

          {selected?.paidThisMonth && (
            <div className="flex items-start gap-2 rounded-lg border border-kiranam-warning/40 bg-kiranam-warning-soft px-3.5 py-2.5 text-sm text-kiranam-warning">
              <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
              <p>{selected.full_name || 'This contributor'} already has a successful contribution recorded this month. Recording another will add a second one.</p>
            </div>
          )}

          {!selected && (
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contributor by name or phone…"
                className={inputClass}
                autoFocus
              />
              {matches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-kiranam-border bg-kiranam-surface shadow-elevation-md">
                  {matches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelected(c);
                        setQuery('');
                      }}
                      className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-left text-sm transition hover:bg-kiranam-surface-alt"
                    >
                      <span className="font-medium text-kiranam-ink">{c.full_name || 'Unnamed'}</span>
                      <span className="text-xs text-kiranam-muted">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <input name="amount" type="number" min="1" step="1" placeholder="Amount (₹)" required className={inputClass} />
          <input name="date" type="date" className={inputClass} />
          {campaigns.length > 0 && (
            <select name="campaign_id" defaultValue="" className={inputClass}>
              <option value="">General / monthly commitment</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  Campaign: {c.title}
                </option>
              ))}
            </select>
          )}
          <input name="note" placeholder="Note (optional)" className={inputClass} />

          {state?.error && (
            <p className="text-sm text-kiranam-danger" role="alert">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending || !selected} className={buttonPrimary}>
            {pending ? 'Recording…' : 'Record Contribution'}
          </button>
        </form>
      </Modal>
    </>
  );
}
