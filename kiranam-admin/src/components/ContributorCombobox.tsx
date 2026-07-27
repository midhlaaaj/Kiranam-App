'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { inputClass } from '@/lib/ui';

interface ContributorOption {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export function ContributorCombobox({
  contributors,
  name = 'contributorId',
}: {
  contributors: ContributorOption[];
  name?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ContributorOption | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? contributors.filter(
          (c) => c.full_name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
        )
      : contributors;
    return pool.slice(0, 8);
  }, [contributors, query]);

  function select(c: ContributorOption) {
    setSelected(c);
    setQuery(`${c.full_name || 'Unnamed'} — ${c.phone || ''}`);
    setOpen(false);
  }

  return (
    <div className="relative w-full max-w-sm" ref={rootRef}>
      <input type="hidden" name={name} value={selected?.id || ''} />
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-kiranam-muted" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          placeholder="Search contributors by name or phone…"
          className={`${inputClass} pl-9`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-kiranam-border bg-kiranam-surface shadow-elevation-md">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2.5 text-sm text-kiranam-muted">No contributors match.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c)}
                className="block w-full cursor-pointer px-3.5 py-2.5 text-left text-sm transition hover:bg-kiranam-surface-alt"
              >
                <span className="font-medium text-kiranam-ink">{c.full_name || 'Unnamed'}</span>{' '}
                <span className="text-kiranam-muted">— {c.phone}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
