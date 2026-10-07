'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { checkKkNumberCoverage, setAutoAssignKkNumber, type KkCoverageState } from './actions';
import { friendlyErrorMessage } from '@/lib/errors';
import { buttonSecondary, cardClass } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { KkCoverageModal } from './KkCoverageModal';

export function KkNumberSettings({ autoAssignEnabled }: { autoAssignEnabled: boolean }) {
  const [checking, startCheck] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [enabled, setEnabled] = useState(autoAssignEnabled);
  const [coverage, setCoverage] = useState<Required<Pick<KkCoverageState, 'missing' | 'total'>> | null>(null);

  function handleCheck() {
    startCheck(async () => {
      const result = await checkKkNumberCoverage();
      if (result.error) {
        toast.error(friendlyErrorMessage(result.error));
      } else {
        // The modal header carries the count — no separate toast.
        setCoverage({ missing: result.missing ?? [], total: result.total ?? 0 });
      }
    });
  }

  function handleToggle(next: boolean) {
    setEnabled(next);
    startToggle(async () => {
      try {
        await setAutoAssignKkNumber(next);
        toast.success(next ? 'Auto-assign turned on.' : 'Auto-assign turned off.');
      } catch (err) {
        setEnabled(!next);
        toast.error(err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.');
      }
    });
  }

  return (
    <section className={cn(cardClass, 'max-w-2xl p-5')} aria-labelledby="kk-heading">
      <h2 id="kk-heading" className="text-base font-semibold text-kiranam-ink">
        KK numbers
      </h2>
      <p className="mt-1 text-sm text-kiranam-muted">
        Every contributor gets a KK number (KK1, KK2, …). Check who still needs one before turning on auto-assign.
      </p>

      <button type="button" onClick={handleCheck} disabled={checking} className={cn(buttonSecondary, 'mt-4')}>
        {checking ? 'Checking…' : 'Check who’s missing one'}
      </button>

      <div className="mt-5 flex items-start justify-between gap-4 border-t border-kiranam-border pt-5">
        <div>
          <p id="kk-auto-label" className="text-sm font-medium text-kiranam-ink">
            Auto-assign to new contributors
          </p>
          <p id="kk-auto-desc" className="mt-1 text-sm text-kiranam-muted">
            New contributors get the next number after the highest one in use, and the KK field is hidden from
            Register contributor.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="kk-auto-label"
          aria-describedby="kk-auto-desc"
          disabled={toggling}
          onClick={() => handleToggle(!enabled)}
          className="flex h-10 shrink-0 cursor-pointer items-center disabled:cursor-wait disabled:opacity-60"
        >
          <span
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
              enabled ? 'bg-kiranam-success' : 'bg-kiranam-border-strong'
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 rounded-full bg-white shadow-elevation-sm transition-transform duration-200',
                enabled ? 'translate-x-5.5' : 'translate-x-0.5'
              )}
            />
          </span>
        </button>
      </div>

      {coverage && (
        <KkCoverageModal
          contributors={coverage.missing}
          total={coverage.total}
          onClose={() => setCoverage(null)}
          onAssigned={(id) =>
            setCoverage((prev) => (prev ? { ...prev, missing: prev.missing.filter((c) => c.id !== id) } : prev))
          }
        />
      )}
    </section>
  );
}
