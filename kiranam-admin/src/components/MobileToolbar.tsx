'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, ListFilter, Search } from 'lucide-react';

const iconButtonClass = (active: boolean) =>
  `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${
    active
      ? 'border-kiranam-primary bg-kiranam-primary-soft text-kiranam-primary'
      : 'border-kiranam-border-strong bg-kiranam-surface text-kiranam-muted hover:text-kiranam-ink'
  }`;

/** Compact one-line replacement for `AddNewPanel`'s filters/search row on
 * small screens: a filter icon on the left, search (and optionally export)
 * icons on the right, each expanding the full control beneath the row
 * instead of cramming pills + a search box + a button onto one line. */
export function MobileToolbar({
  filters,
  search,
  exportHref,
}: {
  filters: React.ReactNode;
  search: React.ReactNode;
  exportHref?: string;
}) {
  const [panel, setPanel] = useState<'filters' | 'search' | null>(null);
  const toggle = (p: 'filters' | 'search') => setPanel((current) => (current === p ? null : p));

  return (
    <div className="mb-6 sm:hidden">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => toggle('filters')}
          aria-label="Filter"
          aria-pressed={panel === 'filters'}
          className={iconButtonClass(panel === 'filters')}
        >
          <ListFilter size={18} strokeWidth={2.25} />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggle('search')}
            aria-label="Search"
            aria-pressed={panel === 'search'}
            className={iconButtonClass(panel === 'search')}
          >
            <Search size={18} strokeWidth={2.25} />
          </button>
          {exportHref && (
            <Link href={exportHref} aria-label="Export CSV" className={iconButtonClass(false)}>
              <Download size={18} strokeWidth={2.25} />
            </Link>
          )}
        </div>
      </div>

      {panel === 'filters' && <div className="mt-3">{filters}</div>}
      {panel === 'search' && <div className="mt-3">{search}</div>}
    </div>
  );
}
