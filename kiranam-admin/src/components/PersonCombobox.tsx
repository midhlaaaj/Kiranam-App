'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { inputClass } from '@/lib/ui';

interface PersonOption {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export function PersonCombobox({
  people,
  name,
  placeholder = 'Search by name or phone…',
  emptyLabel = 'No matches.',
}: {
  people: PersonOption[];
  name: string;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PersonOption | null>(null);
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
      ? people.filter(
          (p) => p.full_name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q)
        )
      : people;
    return pool.slice(0, 8);
  }, [people, query]);

  function select(p: PersonOption) {
    setSelected(p);
    setQuery(`${p.full_name || 'Unnamed'} — ${p.phone || ''}`);
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
          placeholder={placeholder}
          className={`${inputClass} pl-9`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-kiranam-border bg-kiranam-surface shadow-elevation-md">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2.5 text-sm text-kiranam-muted">{emptyLabel}</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p)}
                className="block w-full cursor-pointer px-3.5 py-2.5 text-left text-sm transition hover:bg-kiranam-surface-alt"
              >
                <span className="font-medium text-kiranam-ink">{p.full_name || 'Unnamed'}</span>{' '}
                <span className="text-kiranam-muted">— {p.phone}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
