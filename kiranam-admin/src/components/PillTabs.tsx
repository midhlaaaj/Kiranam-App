'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface PillTabItem {
  key: string;
  label: string;
  href: string;
  active: boolean;
  scroll?: boolean;
}

// A segmented control with a sliding background indicator, backed by real
// <Link> navigation (server-rendered tabs via searchParams, not client
// state). Plain pill buttons with a conditional background class each
// swapped their bg instantly on navigation with no shared element to
// animate between — this measures the active pill's position and slides
// one shared indicator to it instead.
export function PillTabs({ items }: { items: PillTabItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const activeKey = items.find((item) => item.active)?.key;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeEl = activeKey ? itemRefs.current.get(activeKey) : undefined;
    if (!container || !activeEl) return;
    setIndicator({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
  }, [activeKey]);

  return (
    // max-w-full + overflow-x-auto: a wide pill row (4-5 items) previously
    // had nowhere to go but push the whole page into horizontal scroll on
    // a narrow phone, with no indication it was scrollable. Now only this
    // row scrolls, and the pills themselves stay unshrunk (shrink-0).
    <div className="max-w-full overflow-x-auto no-scrollbar">
      <div ref={containerRef} className="relative flex w-max gap-1 rounded-full bg-kiranam-surface-alt p-1">
        {indicator && (
          <div
            className="absolute top-1 bottom-1 rounded-full bg-kiranam-surface shadow-elevation-sm transition-[left,width] duration-200 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
            aria-hidden="true"
          />
        )}
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            scroll={item.scroll}
            ref={(el) => {
              if (el) itemRefs.current.set(item.key, el);
              else itemRefs.current.delete(item.key);
            }}
            className={`relative z-10 shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ease-out ${
              item.active ? 'text-kiranam-ink' : 'text-kiranam-muted hover:text-kiranam-ink'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
