'use client';

import { cloneElement, isValidElement, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { buttonPrimary } from '@/lib/ui';
import { Modal } from './Modal';

/** Page header + "create" form, used by list pages that support inline
 * creation (Campaigns, Events, Notifications, Contributors). Renders the
 * title row with the create-toggle in the top-right corner (like
 * PageHeading, but with an action button baked in) plus an optional
 * filters/search toolbar row — filters on the left, search on the right —
 * directly beneath it.
 *
 * By default the form expands inline below the toolbar. Pass `modal` to
 * render it in a popup instead — in that mode, if `children` is a single
 * element that accepts an `onDone` prop, it's injected automatically so the
 * form can close itself after a successful submit. (Done via cloneElement,
 * entirely within this Client Component, rather than accepting a function as
 * `children` — a function can't be passed in from a Server Component page,
 * since props crossing that boundary must be serializable.) */
export function AddNewPanel({
  title,
  description,
  label,
  filters,
  search,
  mobileToolbar,
  children,
  modal = false,
}: {
  title: string;
  description?: React.ReactNode;
  label: string;
  /** Left side of the toolbar row (status pills, tabs, etc). */
  filters?: React.ReactNode;
  /** Right side of the toolbar row (search box + button). */
  search?: React.ReactNode;
  /** Compact icon-row replacement for `filters`/`search` on small screens
   * (e.g. `MobileToolbar`). When passed, the regular toolbar row hides below
   * `sm:` in favor of this instead of wrapping. */
  mobileToolbar?: React.ReactNode;
  children: React.ReactNode;
  /** Render the create form in a popup instead of expanding it inline. */
  modal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const content =
    modal && isValidElement(children)
      ? cloneElement(children as React.ReactElement<{ onDone?: () => void }>, { onDone: close })
      : children;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kiranam-border pb-5 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-kiranam-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-kiranam-muted">{description}</p>}
        </div>
        <button type="button" onClick={() => setOpen((o) => (modal ? true : !o))} className={buttonPrimary}>
          {!modal && open ? <X size={16} strokeWidth={2.25} /> : <Plus size={16} strokeWidth={2.25} />}
          {!modal && open ? 'Close' : label}
        </button>
      </div>

      {(filters || search) && (
        <div
          className={`mb-6 flex-wrap items-center justify-between gap-3 ${mobileToolbar ? 'hidden sm:flex' : 'flex'}`}
        >
          <div className="flex flex-wrap items-center gap-3">{filters}</div>
          <div className="flex flex-wrap items-center gap-3">{search}</div>
        </div>
      )}
      {mobileToolbar}

      {modal ? (
        <Modal open={open} onClose={close} title={label}>
          {content}
        </Modal>
      ) : (
        open && <div className="mb-6">{content}</div>
      )}
    </div>
  );
}
