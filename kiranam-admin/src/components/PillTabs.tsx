'use client';

import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterTriggerClass } from '@/components/filters/FilterBar';

interface PillTabItem {
  key: string;
  label: string;
  href: string;
  active: boolean;
  scroll?: boolean;
  /** Optional count badge, e.g. pending items needing attention. */
  count?: number;
}

// A compact dropdown pill — "Status: Ongoing ▾" — backed by real <Link>
// navigation (server-rendered views via searchParams, not client state).
// Replaces the old segmented tab strip, which took a full row and didn't
// scale past four or five options. Name kept so every caller upgrades at once.
export function PillTabs({ items, label = 'Show' }: { items: PillTabItem[]; label?: string }) {
  const active = items.find((i) => i.active) ?? items[0];
  // The first item is the "no filter" view in every caller.
  const isFiltered = !!active && active.key !== items[0]?.key;

  return (
    <Menu.Root>
      <Menu.Trigger className={filterTriggerClass(isFiltered)} aria-label={`${label}: ${active?.label}`}>
        <span>{label}:</span>
        <span className={cn('truncate', isFiltered ? 'font-semibold' : 'text-kiranam-ink')}>{active?.label}</span>
        {!!active?.count && (
          <span className="rounded-full bg-kiranam-ink px-1.5 text-xs font-semibold tabular-nums text-white">{active.count}</span>
        )}
        <ChevronDown size={14} strokeWidth={2.25} className="shrink-0 opacity-70" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6} className="z-50 outline-none">
          <Menu.Popup className="z-50 min-w-48 rounded-lg border border-kiranam-border bg-kiranam-surface p-1 text-sm text-kiranam-ink shadow-elevation-md outline-none">
            {items.map((item) => (
              <Menu.LinkItem
                key={item.key}
                render={<Link href={item.href} scroll={item.scroll} />}
                closeOnClick
                className="flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-highlighted:bg-kiranam-surface-alt"
              >
                <span className="flex w-4 shrink-0 justify-center">{item.active && <Check size={14} strokeWidth={2.5} />}</span>
                <span className="flex-1">{item.label}</span>
                {!!item.count && (
                  <span className="rounded-full bg-kiranam-ink px-1.5 text-xs font-semibold tabular-nums text-white">{item.count}</span>
                )}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
