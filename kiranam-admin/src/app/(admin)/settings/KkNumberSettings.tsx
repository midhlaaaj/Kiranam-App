'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { checkKkNumberCoverage, type KkCoverageState } from './actions';
import {
  assignKkBatch,
  disableAutoAssign,
  finishEnableAutoAssign,
  previewAutoAssign,
  type AutoAssignPreview,
} from './autoAssignActions';
import { friendlyErrorMessage } from '@/lib/errors';
import { buttonPrimary, buttonSecondary, cardClass } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { KkSeries } from '@/lib/kk';
import { Modal } from '@/components/Modal';
import { KkCoverageModal } from './KkCoverageModal';

const SERIES_COPY: Record<KkSeries, { title: string; who: string; example: string }> = {
  KK: { title: 'KK numbers', who: 'Indian numbers (+91)', example: 'KK1, KK2, …' },
  KKG: { title: 'KKG numbers', who: 'numbers from other countries', example: 'KKG1, KKG2, …' },
};

export function KkNumberSettings({ autoAssign }: { autoAssign: Record<KkSeries, boolean> }) {
  const [checking, startCheck] = useTransition();
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

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <section className={cn(cardClass, 'p-5')} aria-labelledby="kk-heading">
        <h2 id="kk-heading" className="text-base font-semibold text-kiranam-ink">
          KK numbers
        </h2>
        <p className="mt-1 text-sm text-kiranam-muted">
          Every contributor gets a KK number: KK for Indian numbers and KKG for numbers from other countries. Check who
          still needs one, or turn on auto-assign for a series below.
        </p>
        <button type="button" onClick={handleCheck} disabled={checking} className={cn(buttonSecondary, 'mt-4')}>
          {checking ? 'Checking…' : 'Check who’s missing one'}
        </button>
      </section>

      <SeriesAutoAssign series="KK" initiallyOn={autoAssign.KK} />
      <SeriesAutoAssign series="KKG" initiallyOn={autoAssign.KKG} />

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
    </div>
  );
}

/** One series' auto-assign switch. Turning it on (or pressing "Number everyone
 * missing…") first shows how many people are missing a number and which number
 * comes next, and only then writes anything — in small batches, with a progress
 * bar that fills as people are numbered. */
function SeriesAutoAssign({ series, initiallyOn }: { series: KkSeries; initiallyOn: boolean }) {
  const copy = SERIES_COPY[series];
  const [enabled, setEnabled] = useState(initiallyOn);
  const [checking, startChecking] = useTransition();
  const [preview, setPreview] = useState<Required<Pick<AutoAssignPreview, 'count' | 'start'>> | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [startInput, setStartInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = checking || !!progress;

  function openPreview() {
    startChecking(async () => {
      const result = await previewAutoAssign(series);
      if (result.error || result.count === undefined || result.start === undefined) {
        toast.error(result.error ?? 'Could not check who needs a number.');
        return;
      }
      setError(null);
      setProgress(null);
      setStartInput(String(result.start));
      setPreview({ count: result.count, start: result.start });
    });
  }

  function handleToggle() {
    if (!enabled) {
      openPreview();
      return;
    }
    startChecking(async () => {
      const result = await disableAutoAssign(series);
      if (result.error) {
        toast.error(result.error);
      } else {
        setEnabled(false);
        toast.success(`Auto-assign for ${series} turned off.`);
      }
    });
  }

  async function handleConfirm() {
    if (!preview) return;
    const start = Number(startInput);
    if (!Number.isInteger(start) || start < 1) {
      setError('Enter a whole number, 1 or higher.');
      return;
    }
    setError(null);
    const total = preview.count;
    setProgress({ done: 0, total });
    let next = start;
    let done = 0;
    let first: string | undefined;
    let last: string | undefined;
    try {
      // Numbered in small batches so the bar reflects real progress.
      while (done < total) {
        const result = await assignKkBatch(series, next, 25);
        if (result.error) {
          setError(`${result.error} ${done} of ${total} were numbered; run it again to carry on.`);
          setProgress(null);
          return;
        }
        if (!result.assigned) break;
        done += result.assigned;
        next = result.next ?? next;
        first ??= result.first;
        last = result.last ?? last;
        setProgress({ done: Math.min(done, total), total });
        if (!result.remaining) break;
      }
      if (!enabled) {
        const fin = await finishEnableAutoAssign(series, { assigned: done, first, last });
        if (fin.error) {
          setError(fin.error);
          setProgress(null);
          return;
        }
        setEnabled(true);
      }
      setPreview(null);
      setProgress(null);
      toast.success(
        done
          ? `${done} numbered (${first}${last !== first ? ` to ${last}` : ''}).${enabled ? '' : ` Auto-assign for ${series} is on.`}`
          : `Auto-assign for ${series} is on.`
      );
    } catch {
      setError('Something went wrong. Run it again to carry on.');
      setProgress(null);
    }
  }

  const labelId = `${series}-auto-label`;
  const descId = `${series}-auto-desc`;
  const startNum = Number(startInput);
  const validStart = Number.isInteger(startNum) && startNum >= 1;

  return (
    <section className={cn(cardClass, 'p-5')} aria-labelledby={`${series}-heading`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`${series}-heading`} className="text-base font-semibold text-kiranam-ink">
            {copy.title}
          </h2>
          <p id={labelId} className="mt-1 text-sm font-medium text-kiranam-ink">
            Auto-assign for {copy.who}
          </p>
          <p id={descId} className="mt-1 text-sm text-kiranam-muted">
            New contributors with {copy.who} get the next {series} number ({copy.example}), and the KK number field is
            hidden for them in Register contributor. Turning it on also numbers everyone with {copy.who} who has no KK
            or KKG number yet.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={labelId}
          aria-describedby={descId}
          disabled={busy}
          onClick={handleToggle}
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

      {enabled && (
        <button type="button" onClick={openPreview} disabled={busy} className={cn(buttonSecondary, 'mt-4')}>
          {checking ? 'Checking…' : `Number everyone missing a ${series} number`}
        </button>
      )}

      <Modal
        open={!!preview}
        onClose={() => (busy ? undefined : setPreview(null))}
        title={enabled ? `Assign missing ${series} numbers?` : `Turn on auto-assign for ${series}?`}
        description={copy.who[0].toUpperCase() + copy.who.slice(1)}
      >
        {preview && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-kiranam-ink">
              {preview.count === 0
                ? `Everyone with ${copy.who} already has a number.${enabled ? '' : ' New contributors will get one automatically.'}`
                : `${preview.count} user${preview.count === 1 ? ' is' : 's are'} missing a ${series} number. ${
                    preview.count === 1 ? 'This user' : 'All of them'
                  } will be numbered in order of sign-up, oldest first${
                    validStart
                      ? `, from ${series}${startNum} to about ${series}${startNum + preview.count - 1}. After that, the next number given automatically will be about ${series}${startNum + preview.count}`
                      : ''
                  }.`}
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${series}-start`} className="text-xs font-semibold text-kiranam-muted">
                Start from
              </label>
              <div className="flex items-center rounded-lg border border-kiranam-input-border bg-kiranam-surface pl-3.5 focus-within:border-kiranam-primary focus-within:ring-3 focus-within:ring-kiranam-primary/15">
                <span className="text-sm font-semibold text-kiranam-muted" aria-hidden>
                  {series}
                </span>
                <input
                  id={`${series}-start`}
                  inputMode="numeric"
                  value={startInput}
                  onChange={(e) => {
                    setStartInput(e.target.value.replace(/\D/g, '').slice(0, 7));
                    setError(null);
                  }}
                  disabled={busy}
                  className="w-full min-w-0 bg-transparent px-2 py-2.5 text-sm tabular-nums text-kiranam-ink outline-none"
                />
              </div>
              <p className="text-xs text-kiranam-muted">
                Suggested: {series}
                {preview.start}, the next after the highest {series} number in use.
              </p>
            </div>
            {progress && (
              <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-kiranam-border"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={progress.done}
                >
                  <div
                    className="h-full rounded-full bg-kiranam-primary transition-[width] duration-300"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs tabular-nums text-kiranam-muted">
                  {progress.done} of {progress.total} numbered
                </p>
              </div>
            )}
            {error && (
              <p className="text-sm text-kiranam-danger" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPreview(null)} disabled={busy} className={buttonSecondary}>
                Cancel
              </button>
              <button type="button" onClick={handleConfirm} disabled={busy} className={buttonPrimary}>
                {progress
                  ? 'Numbering…'
                  : preview.count > 0
                    ? enabled
                      ? `Number ${preview.count}`
                      : `Turn on and number ${preview.count}`
                    : 'Turn on'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
