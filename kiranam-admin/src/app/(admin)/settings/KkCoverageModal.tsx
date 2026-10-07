'use client';

import { useId, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Search } from 'lucide-react';
import { assignKkNumber } from '../contributors/actions';
import type { MissingKkContributor } from './actions';
import { friendlyErrorMessage } from '@/lib/errors';
import { formatPhone } from '@/lib/phone';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { buttonSecondary, inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** Lists contributors missing a KK number (from "Check KK number coverage")
 * with an inline field to add one on the spot, so an admin doesn't have to
 * go hunting for who still needs backfilling. */
export function KkCoverageModal({
  contributors,
  total,
  onClose,
  onAssigned,
}: {
  contributors: MissingKkContributor[];
  total: number;
  onClose: () => void;
  onAssigned: (contributorId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contributors;
    const digits = q.replace(/\D/g, '');
    return contributors.filter(
      (c) => (c.full_name || '').toLowerCase().includes(q) || (digits && (c.phone || '').includes(digits))
    );
  }, [contributors, query]);

  const description =
    contributors.length === 0
      ? `All ${total} contributors have one.`
      : `${contributors.length} of ${total} contributors still need one.`;

  return (
    <Modal open onClose={onClose} title="Missing KK numbers" description={description}>
      {contributors.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Everyone has a KK number" description="No backfill needed." />
      ) : (
        <>
          {contributors.length > 8 && (
            <div className="relative mb-3">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kiranam-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find by name or phone"
                aria-label="Find contributor"
                className={cn(inputClass, 'h-9 py-0 pl-9')}
              />
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-kiranam-muted">No one matches “{query}”.</p>
          ) : (
            <ul className="divide-y divide-kiranam-border rounded-lg border border-kiranam-border">
              {filtered.map((c) => (
                <ContributorRow key={c.id} contributor={c} onAssigned={() => onAssigned(c.id)} />
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

function ContributorRow({
  contributor,
  onAssigned,
}: {
  contributor: MissingKkContributor;
  onAssigned: () => void;
}) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const name = contributor.full_name || 'Unnamed contributor';

  function handleAdd() {
    if (!digits) {
      setError('Enter a number.');
      inputRef.current?.focus();
      return;
    }
    const kkNumber = `KK${Number(digits)}`;
    setError(null);
    startTransition(async () => {
      try {
        await assignKkNumber(contributor.id, kkNumber);
        toast.success(`${kkNumber} assigned to ${name}.`);
        onAssigned();
      } catch (err) {
        setError(friendlyErrorMessage(err instanceof Error ? err.message : 'Something went wrong.'));
      }
    });
  }

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5">
      <div className="min-w-0">
        <p title={name} className="truncate text-sm font-semibold text-kiranam-ink">
          {name}
        </p>
        <p className="truncate text-xs tabular-nums text-kiranam-muted">
          {contributor.phone ? formatPhone(contributor.phone) : 'No phone on file'}
        </p>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <div
          className={cn(
            'flex h-9 w-24 items-center rounded-lg border bg-kiranam-surface text-sm transition focus-within:border-kiranam-primary focus-within:ring-3 focus-within:ring-kiranam-primary/15',
            error ? 'border-kiranam-danger' : 'border-kiranam-input-border'
          )}
        >
          <span className="pl-2.5 font-semibold text-kiranam-muted" aria-hidden>
            KK
          </span>
          <input
            ref={inputRef}
            value={digits}
            onChange={(e) => {
              setDigits(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (error) setError(null);
            }}
            inputMode="numeric"
            placeholder="123"
            disabled={pending}
            aria-label={`KK number for ${name}`}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="w-full min-w-0 bg-transparent py-0 pl-0.5 pr-2 tabular-nums text-kiranam-ink outline-none placeholder:text-kiranam-muted-2"
          />
        </div>
        <button type="submit" disabled={pending} className={cn(buttonSecondary, 'h-9 px-3 py-0 text-sm')}>
          {pending ? 'Saving…' : 'Add'}
        </button>
      </form>
      {error && (
        <p id={errorId} role="alert" className="col-span-2 text-right text-xs text-kiranam-danger">
          {error}
        </p>
      )}
    </li>
  );
}
