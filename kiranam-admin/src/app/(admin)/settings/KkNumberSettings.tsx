'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { checkKkNumberCoverage, setAutoAssignKkNumber } from './actions';
import { friendlyErrorMessage } from '@/lib/errors';
import { buttonSecondary, cardClass } from '@/lib/ui';

export function KkNumberSettings({ autoAssignEnabled }: { autoAssignEnabled: boolean }) {
  const [checking, startCheck] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [enabled, setEnabled] = useState(autoAssignEnabled);

  function handleCheck() {
    startCheck(async () => {
      const result = await checkKkNumberCoverage();
      if (result.error) toast.error(friendlyErrorMessage(result.error));
      else if (result.message) toast(result.message);
    });
  }

  function handleToggle(next: boolean) {
    setEnabled(next);
    startToggle(async () => {
      try {
        await setAutoAssignKkNumber(next);
        toast.success(next ? 'Auto-assign KK number turned on.' : 'Auto-assign KK number turned off.');
      } catch (err) {
        setEnabled(!next);
        toast.error(err instanceof Error ? friendlyErrorMessage(err.message) : 'Something went wrong.');
      }
    });
  }

  return (
    <div className={`mt-6 grid gap-4 ${cardClass} p-5`}>
      <div>
        <h2 className="text-sm font-semibold text-kiranam-ink">KK Numbers</h2>
        <p className="mt-1 text-sm text-kiranam-muted">
          Each contributor has a KK number (KK1, KK2, …) assigned outside this system so far. Check how many
          contributors still need one before turning on auto-assign.
        </p>
      </div>

      <div>
        <button type="button" onClick={handleCheck} disabled={checking} className={buttonSecondary}>
          {checking ? 'Checking…' : 'Check KK number coverage'}
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-kiranam-ink">
        <input
          type="checkbox"
          checked={enabled}
          disabled={toggling}
          onChange={(e) => handleToggle(e.target.checked)}
          className="accent-kiranam-primary"
        />
        Auto-assign KK number to new contributors
      </label>
      <p className="-mt-2 text-xs text-kiranam-muted">
        When on, the KK Number field disappears from Register Contributor and each new contributor is
        automatically given the next KK number after the highest one currently in use.
      </p>
    </div>
  );
}
