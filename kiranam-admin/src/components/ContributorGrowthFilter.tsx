'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buttonSecondary, inputClass, pillTabClass, pillTabItemClass } from '@/lib/ui';

export function ContributorGrowthFilter({
  granularity,
  from,
  to,
}: {
  granularity: 'weekly' | 'monthly';
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCustom = Boolean(from && to);
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(isCustom);
  const [customFrom, setCustomFrom] = useState(from || '');
  const [customTo, setCustomTo] = useState(to || '');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function navigate(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    startTransition(() => {
      router.push(`/?${next.toString()}`, { scroll: false });
    });
  }

  function selectPreset(g: 'weekly' | 'monthly') {
    setOpen(false);
    navigate({ cgRange: g, cgFrom: undefined, cgTo: undefined });
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    navigate({ cgRange: undefined, cgFrom: customFrom, cgTo: customTo });
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <div className={`${pillTabClass} ${isPending ? 'opacity-60' : ''} transition-opacity`}>
        <button
          type="button"
          onClick={() => selectPreset('weekly')}
          className={pillTabItemClass(!isCustom && granularity === 'weekly')}
        >
          Weekly
        </button>
        <button
          type="button"
          onClick={() => selectPreset('monthly')}
          className={pillTabItemClass(!isCustom && granularity === 'monthly')}
        >
          Monthly
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className={pillTabItemClass(isCustom)}>
          Custom
        </button>
      </div>

      {open && (
        <div className="absolute right-0 z-20 mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-kiranam-border bg-kiranam-surface p-3 shadow-elevation-md">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className={`${inputClass} w-auto`}
          />
          <span className="text-sm text-kiranam-muted">to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={`${inputClass} w-auto`} />
          <button type="button" onClick={applyCustom} className={buttonSecondary}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
