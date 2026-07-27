'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { buttonPrimary } from '@/lib/ui';

/** Page header + collapsible "create" form, used by list pages that support
 * inline creation (Campaigns, Events, Notifications). Renders the title row
 * with the create-toggle in the top-right corner (like PageHeading, but with
 * an action button baked in) plus an optional filters/search toolbar row —
 * filters on the left, search on the right — directly beneath it. */
export function AddNewPanel({
  title,
  description,
  label,
  filters,
  search,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  label: string;
  /** Left side of the toolbar row (status pills, tabs, etc). */
  filters?: React.ReactNode;
  /** Right side of the toolbar row (search box + button). */
  search?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kiranam-border pb-5 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-kiranam-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-kiranam-muted">{description}</p>}
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className={buttonPrimary}>
          {open ? <X size={16} strokeWidth={2.25} /> : <Plus size={16} strokeWidth={2.25} />}
          {open ? 'Close' : label}
        </button>
      </div>

      {(filters || search) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">{filters}</div>
          <div className="flex flex-wrap items-center gap-3">{search}</div>
        </div>
      )}

      {open && <div className="mb-6">{children}</div>}
    </div>
  );
}
