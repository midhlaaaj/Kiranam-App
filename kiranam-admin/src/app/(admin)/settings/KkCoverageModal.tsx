'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { assignKkNumber } from '../contributors/actions';
import type { MissingKkContributor } from './actions';
import { friendlyErrorMessage } from '@/lib/errors';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { buttonPrimary, inputClass } from '@/lib/ui';
import { CheckCircle2 } from 'lucide-react';

/** Lists contributors missing a KK number (from "Check KK number coverage")
 * with an inline field to add one on the spot, so an admin doesn't have to
 * go hunting for who still needs backfilling. */
export function KkCoverageModal({
  contributors,
  onClose,
  onAssigned,
}: {
  contributors: MissingKkContributor[];
  onClose: () => void;
  onAssigned: (contributorId: string) => void;
}) {
  return (
    <Modal open onClose={onClose} title="Contributors missing a KK number">
      {contributors.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Everyone has a KK number" description="No backfill needed." />
      ) : (
        <div className="grid gap-3">
          {contributors.map((c) => (
            <ContributorRow key={c.id} contributor={c} onAssigned={() => onAssigned(c.id)} />
          ))}
        </div>
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
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const kkNumber = value.trim();
    if (!kkNumber) return;
    startTransition(async () => {
      try {
        await assignKkNumber(contributor.id, kkNumber);
        toast.success(`${kkNumber} assigned to ${contributor.full_name || 'this contributor'}.`);
        onAssigned();
      } catch (err) {
        toast.error(friendlyErrorMessage(err instanceof Error ? err.message : 'Something went wrong.'));
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-kiranam-border-strong p-3">
      <div className="min-w-0">
        <Link href={`/contributors/${contributor.id}`} className="font-semibold text-kiranam-ink hover:underline">
          {contributor.full_name || 'Unnamed'}
        </Link>
        <p className="text-xs text-kiranam-muted">{contributor.phone || 'No phone on file'}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="e.g. KK2001"
          disabled={pending}
          className={`${inputClass} w-32`}
        />
        <button type="button" onClick={handleAdd} disabled={pending || !value.trim()} className={`${buttonPrimary} px-3 py-2 text-xs`}>
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  );
}
