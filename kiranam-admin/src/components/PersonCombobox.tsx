'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

interface PersonOption {
  id: string;
  full_name: string | null;
  phone: string | null;
}

const MAX_RESULTS = 8;
const label = (p: PersonOption) => `${p.full_name || 'Unnamed'} — ${p.phone || ''}`;

/**
 * Search-and-pick field for people. The result list is rendered in a portal
 * and positioned against the input, so it floats above dialogs and scroll
 * areas instead of being clipped by (or adding a scrollbar to) them. Fully
 * keyboard-driven: ↑/↓ to move, Enter to pick, Esc to close.
 */
export function PersonCombobox({
  people,
  name,
  placeholder = 'Search by name or phone…',
  emptyLabel = 'No matches.',
  initial = null,
  onSelect,
  className = 'max-w-sm',
}: {
  people: PersonOption[];
  name: string;
  placeholder?: string;
  emptyLabel?: string;
  /** Pre-fills the combobox with an already-selected person (e.g. editing an
   * existing assignment) instead of starting empty. */
  initial?: PersonOption | null;
  /** Fires whenever the selection changes (pick or clear) — for callers that
   * need the value outside of reading the form on submit. */
  onSelect?: (person: PersonOption | null) => void;
  /** Width of the field — compact by default; pass `max-w-none` to fill a form. */
  className?: string;
}) {
  const [query, setQuery] = useState(initial ? label(initial) : '');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PersonOption | null>(initial);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; flip: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const { shown, total } = useMemo(() => {
    // When something is already picked the box holds its label — show the
    // full list then, not a search for that label.
    const q = selected ? '' : query.trim().toLowerCase();
    const pool = q
      ? people.filter((p) => p.full_name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q))
      : people;
    return { shown: pool.slice(0, MAX_RESULTS), total: pool.length };
  }, [people, query, selected]);

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Open upwards when there isn't room below (e.g. the bottom of a dialog).
    const flip = window.innerHeight - r.bottom < 280 && r.top > 280;
    setRect({ left: r.left, top: flip ? r.top : r.bottom, width: r.width, flip });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    // Capture scrolls from any ancestor (the dialog body, the page).
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place, shown.length]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function select(p: PersonOption) {
    setSelected(p);
    setQuery(label(p));
    setOpen(false);
    onSelect?.(p);
    inputRef.current?.focus();
  }

  function clear() {
    setSelected(null);
    setQuery('');
    onSelect?.(null);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(shown.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && shown[active]) {
      e.preventDefault();
      select(shown[active]);
    } else if (e.key === 'Escape' && open) {
      // Close the list only — don't let Esc also close the surrounding dialog.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className={cn('relative w-full', className)} ref={rootRef}>
      <input type="hidden" name={name} value={selected?.id || ''} />
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-kiranam-muted" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${listId}-${shown[active].id}` : undefined}
          value={query}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setActive(0);
            setOpen(true);
            onSelect?.(null);
          }}
          placeholder={placeholder}
          className={cn(inputClass, 'pl-9', selected && 'pr-10')}
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selection"
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {open &&
        rect &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              left: rect.left,
              width: rect.width,
              top: rect.top,
              transform: rect.flip ? 'translateY(calc(-100% - 4px))' : 'translateY(4px)',
            }}
            // Above dialogs (z-50/z-60) and their overlays.
            className="z-[80] max-h-64 overflow-y-auto rounded-lg border border-kiranam-border-strong bg-kiranam-surface py-1 shadow-elevation-lg"
          >
            {shown.length === 0 ? (
              <p className="px-3.5 py-2.5 text-sm text-kiranam-muted">{emptyLabel}</p>
            ) : (
              <>
                {shown.map((p, i) => (
                  <div
                    key={p.id}
                    id={`${listId}-${p.id}`}
                    role="option"
                    aria-selected={selected?.id === p.id}
                    onMouseEnter={() => setActive(i)}
                    // mousedown, not click: the input's blur/outside-click logic
                    // must not close the list before the pick registers.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(p);
                    }}
                    className={cn('flex cursor-pointer flex-col px-3.5 py-2 text-sm', i === active && 'bg-kiranam-surface-alt')}
                  >
                    <span className="font-medium text-kiranam-ink">{p.full_name || 'Unnamed'}</span>
                    <span className="text-xs tabular-nums text-kiranam-muted">{p.phone}</span>
                  </div>
                ))}
                {total > shown.length && (
                  <p className="border-t border-kiranam-border px-3.5 py-2 text-xs text-kiranam-muted">
                    Showing {shown.length} of {total} — keep typing to narrow it down.
                  </p>
                )}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
