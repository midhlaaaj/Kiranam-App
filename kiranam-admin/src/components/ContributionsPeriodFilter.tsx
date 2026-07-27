'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { buttonSecondary, inputClass, pillTabClass, pillTabItemClass } from '@/lib/ui';

export function ContributionsPeriodFilter({
  presets,
  from,
  to,
  status,
}: {
  presets: { label: string; from: string; to: string }[];
  from?: string;
  to?: string;
  status?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isPreset = presets.some((p) => p.from === from && p.to === to);
  const isCustom = Boolean(from && to) && !isPreset;

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

  function goTo(f?: string, t?: string, s?: string) {
    const params = new URLSearchParams();
    const nextStatus = s !== undefined ? s : status;
    if (nextStatus) params.set('status', nextStatus);
    if (f) params.set('from', f);
    if (t) params.set('to', t);
    startTransition(() => {
      router.push(`/contributions?${params.toString()}`, { scroll: false });
    });
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    goTo(customFrom, customTo);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative" ref={panelRef}>
        <div className={pillTabClass}>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setOpen(false);
                goTo(p.from, p.to);
              }}
              className={pillTabItemClass(from === p.from && to === p.to)}
            >
              {p.label}
            </button>
          ))}
          <button type="button" onClick={() => setOpen((o) => !o)} className={pillTabItemClass(isCustom)}>
            Custom
          </button>
        </div>

        {open && (
          <div className="absolute z-20 mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-kiranam-border bg-kiranam-surface p-3 shadow-elevation-md">
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

      <select
        value={status || ''}
        onChange={(e) => goTo(from, to, e.target.value)}
        className={`${inputClass} w-auto`}
      >
        <option value="">All statuses</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
      </select>
    </div>
  );
}
