'use client';

// Shared, URL-synced filter toolbar. One pattern for every list page:
//
//   <FilterRoot>
//     <FilterBar>
//       <FilterSearch placeholder="Search…" />
//       <FilterPeriod presets={…} />
//       <FilterSelect param="area" label="Area" options={…} />
//     </FilterBar>
//     <ActiveFilters chips={…} />
//     <FilterResults>{table}</FilterResults>
//   </FilterRoot>
//
// Every control writes to the query string (resetting `page`), navigation runs
// in a transition, and <FilterResults> dims while the new results load — so a
// filter change never looks like "nothing happened".

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu } from '@base-ui/react/menu';
import { Popover } from '@base-ui/react/popover';
import { Calendar, Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonPrimary, inputClass } from '@/lib/ui';

type ParamUpdates = Record<string, string | null | undefined>;

interface FilterContextValue {
  params: URLSearchParams;
  isPending: boolean;
  setParams: (updates: ParamUpdates) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterRoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (updates: ParamUpdates) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete('page');
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const value = useMemo(
    () => ({ params: new URLSearchParams(searchParams.toString()), isPending, setParams }),
    [searchParams, isPending, setParams]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('Filter controls must be rendered inside <FilterRoot>');
  return ctx;
}

/** Wraps the results region; dims it and marks it busy while a filter change loads. */
export function FilterResults({ children }: { children: React.ReactNode }) {
  const { isPending } = useFilters();
  return (
    <div
      aria-busy={isPending}
      className={cn('transition-opacity duration-150', isPending && 'pointer-events-none opacity-50')}
    >
      {children}
    </div>
  );
}

/** Lays out filter controls in one wrapping row, with optional trailing actions (e.g. Export). */
export function FilterBar({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-2">
        {children}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

export function filterTriggerClass(active: boolean) {
  return cn(
    'inline-flex h-9 max-w-full items-center gap-1.5 rounded-lg border px-3.5 text-sm transition duration-150 cursor-pointer',
    active
      ? 'border-kiranam-ink/40 bg-kiranam-ink/[0.06] text-kiranam-ink'
      : 'border-kiranam-border-strong bg-kiranam-surface text-kiranam-muted hover:border-kiranam-ink/30 hover:text-kiranam-ink'
  );
}

const popupClass =
  'z-50 max-h-(--available-height) min-w-48 overflow-y-auto rounded-lg border border-kiranam-border bg-kiranam-surface p-1 text-sm text-kiranam-ink shadow-elevation-md outline-none';

const itemClass =
  'flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-highlighted:bg-kiranam-surface-alt';

// ─── Single-select dropdown pill: "Area: Money ▾" ─────────────────────────

export interface FilterOption {
  value: string;
  label: string;
  /** Options sharing a group are rendered under a small heading, in first-seen order. */
  group?: string;
}

export function FilterSelect({
  param,
  label,
  options,
  allLabel = 'Any',
}: {
  param: string;
  label: string;
  options: FilterOption[];
  /** Label for the "no filter" choice, e.g. "Anyone". */
  allLabel?: string;
}) {
  const { params, setParams } = useFilters();
  const value = params.get(param) ?? '';
  const selected = options.find((o) => o.value === value);

  const groups = useMemo(() => {
    const map = new Map<string, FilterOption[]>();
    for (const o of options) {
      const key = o.group ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return [...map.entries()];
  }, [options]);

  const renderItem = (o: { value: string; label: string }) => (
    <Menu.RadioItem key={o.value || '__all'} value={o.value} closeOnClick className={itemClass}>
      <span className="flex w-4 shrink-0 justify-center">
        <Menu.RadioItemIndicator>
          <Check size={14} strokeWidth={2.5} />
        </Menu.RadioItemIndicator>
      </span>
      <span className="truncate">{o.label}</span>
    </Menu.RadioItem>
  );

  return (
    <Menu.Root>
      <Menu.Trigger className={filterTriggerClass(!!selected)} aria-label={`${label}: ${selected?.label ?? allLabel}`}>
        <span>{label}:</span>
        <span className={cn('truncate', selected ? 'font-semibold' : 'text-kiranam-ink')}>
          {selected?.label ?? allLabel}
        </span>
        <ChevronDown size={14} strokeWidth={2.25} className="shrink-0 opacity-70" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6} className="z-50 outline-none">
          <Menu.Popup className={popupClass}>
            <Menu.RadioGroup value={value} onValueChange={(v: string) => setParams({ [param]: v })}>
              {renderItem({ value: '', label: allLabel })}
              {groups.map(([group, items]) =>
                group ? (
                  <Menu.Group key={group}>
                    <Menu.GroupLabel className="px-2.5 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-kiranam-muted">
                      {group}
                    </Menu.GroupLabel>
                    {items.map(renderItem)}
                  </Menu.Group>
                ) : (
                  items.map(renderItem)
                )
              )}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

// ─── Debounced search box with clear button ────────────────────────────────

export function FilterSearch({
  param = 'q',
  placeholder = 'Search…',
  label = 'Search',
  className,
}: {
  param?: string;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const { params, setParams } = useFilters();
  const urlValue = params.get(param) ?? '';
  const [text, setText] = useState(urlValue);
  const lastPushed = useRef(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow external changes (Clear all, back button) without fighting typing.
  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setText(urlValue);
    }
  }, [urlValue]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function commit(next: string) {
    const trimmed = next.trim();
    if (trimmed === lastPushed.current) return;
    lastPushed.current = trimmed;
    setParams({ [param]: trimmed });
  }

  function onChange(next: string) {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 350);
  }

  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search
        size={16}
        strokeWidth={2.25}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kiranam-muted"
        aria-hidden
      />
      <input
        type="search"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (timer.current) clearTimeout(timer.current);
            commit(text);
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className={cn(inputClass, 'h-9 py-0 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            setText('');
            commit('');
          }}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-kiranam-muted hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ─── Date period: presets + validated custom range ─────────────────────────

export interface PeriodPreset {
  label: string;
  from: string;
  to: string;
}

export function FilterPeriod({
  presets,
  label = 'Date',
  allLabel = 'All time',
  fromParam = 'from',
  toParam = 'to',
  /** Text for the active custom range, pre-formatted on the server. */
  activeLabel,
}: {
  presets: PeriodPreset[];
  label?: string;
  allLabel?: string;
  fromParam?: string;
  toParam?: string;
  activeLabel?: string | null;
}) {
  const { params, setParams } = useFilters();
  const from = params.get(fromParam) ?? '';
  const to = params.get(toParam) ?? '';
  const active = Boolean(from && to);
  const preset = presets.find((p) => p.from === from && p.to === to);

  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const invalid = Boolean(customFrom && customTo && customFrom > customTo);
  const canApply = Boolean(customFrom && customTo) && !invalid;

  function pick(f: string, t: string) {
    setParams({ [fromParam]: f, [toParam]: t });
    setOpen(false);
  }

  const current = preset?.label ?? (active ? activeLabel ?? `${from} – ${to}` : allLabel);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setCustomFrom(from);
          setCustomTo(to);
        }
      }}
    >
      <Popover.Trigger className={filterTriggerClass(active)} aria-label={`${label}: ${current}`}>
        <Calendar size={14} strokeWidth={2.25} className="shrink-0" aria-hidden />
        <span className={cn('truncate', active ? 'font-semibold' : 'text-kiranam-ink')}>{current}</span>
        <ChevronDown size={14} strokeWidth={2.25} className="shrink-0 opacity-70" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={6} className="z-50">
          <Popover.Popup className={cn(popupClass, 'w-80 overflow-x-hidden p-2')}>
            <div className="grid gap-0.5">
              {[{ label: allLabel, from: '', to: '' }, ...presets].map((p) => {
                const selected = p.from === from && p.to === to;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => pick(p.from, p.to)}
                    aria-pressed={selected}
                    className={cn(itemClass, 'w-full text-left hover:bg-kiranam-surface-alt')}
                  >
                    <span className="flex w-4 shrink-0 justify-center">
                      {selected && <Check size={14} strokeWidth={2.5} />}
                    </span>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 border-t border-kiranam-border px-1 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kiranam-muted">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid min-w-0 gap-1 text-xs text-kiranam-muted">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className={cn(inputClass, 'w-full min-w-0 px-2 py-2 text-[13px]')}
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-xs text-kiranam-muted">
                  To
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className={cn(inputClass, 'w-full min-w-0 px-2 py-2 text-[13px]')}
                  />
                </label>
              </div>
              {invalid && (
                <p role="alert" className="mt-2 text-xs text-kiranam-danger">
                  “From” must be on or before “To”.
                </p>
              )}
              <button
                type="button"
                disabled={!canApply}
                onClick={() => pick(customFrom, customTo)}
                className={cn(buttonPrimary, 'mt-3 w-full py-2')}
              >
                Apply range
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Active-filter chips + Clear all + result summary ──────────────────────

export interface ActiveChip {
  /** Shown on the chip, e.g. "Area: Money". */
  label: string;
  /** Query params this chip removes when dismissed. */
  params: string[];
}

export function ActiveFilters({ chips, summary }: { chips: ActiveChip[]; summary?: React.ReactNode }) {
  const { setParams } = useFilters();
  if (chips.length === 0 && !summary) return null;

  const clearAll = () => setParams(Object.fromEntries(chips.flatMap((c) => c.params).map((p) => [p, null])));

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      {summary && <span className="mr-1 text-kiranam-muted">{summary}</span>}
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => setParams(Object.fromEntries(chip.params.map((p) => [p, null])))}
          aria-label={`Remove filter ${chip.label}`}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-kiranam-surface-alt pl-3 pr-2 font-medium text-kiranam-ink ring-1 ring-kiranam-border-strong transition hover:ring-kiranam-ink/30"
        >
          {chip.label}
          <X size={14} strokeWidth={2.5} className="text-kiranam-muted" aria-hidden />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-1 inline-flex h-8 cursor-pointer items-center font-semibold text-kiranam-ink underline-offset-4 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
