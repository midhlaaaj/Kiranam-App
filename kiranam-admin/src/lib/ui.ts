// Shared Tailwind class strings so every page reads as one system instead of
// scattered inline utility soup. Kept as plain strings (not components) so
// they can be dropped onto <button>, <a>, <Link>, or form elements alike
// without introducing Server/Client Component boundaries.

import type { CSSProperties } from 'react';

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-kiranam-primary px-5 py-2.5 text-sm font-semibold text-white shadow-elevation-sm transition duration-200 ease-out hover:bg-kiranam-primary-strong active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer';

export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-5 py-2.5 text-sm font-semibold text-kiranam-ink transition duration-200 ease-out hover:bg-kiranam-surface-alt active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer';

export const buttonDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-kiranam-danger px-5 py-2.5 text-sm font-semibold text-white shadow-elevation-sm transition duration-200 ease-out hover:brightness-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer';

export const linkDanger = 'text-sm font-semibold text-kiranam-danger transition hover:underline cursor-pointer';

export const linkGhost = 'text-sm font-semibold text-kiranam-ink transition hover:underline cursor-pointer';

export const linkPrimary = 'text-sm font-semibold text-kiranam-primary transition hover:underline cursor-pointer';

export const inputClass =
  'w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export const cardClass = 'rounded-lg border border-kiranam-border bg-kiranam-surface shadow-elevation-md';

export const tableWrapClass = `${cardClass} overflow-x-auto`;

export const tableHeadRowClass =
  'border-b border-kiranam-border text-left text-xs font-semibold uppercase tracking-wide text-kiranam-muted';

export const tableCellClass = 'px-5 py-3';

export const tableCellNumClass = `${tableCellClass} tabular-nums`;

export const tableRowClass =
  'animate-stagger-in border-b border-kiranam-border last:border-0 transition-colors duration-150 hover:bg-kiranam-surface-alt/70';

export const pillTabClass = 'flex gap-1 rounded-full bg-kiranam-surface-alt p-1 w-fit';

export function pillTabItemClass(active: boolean) {
  return `rounded-full px-4 py-1.5 text-sm font-semibold transition duration-200 ease-out cursor-pointer ${
    active ? 'bg-kiranam-surface text-kiranam-ink shadow-elevation-sm' : 'text-kiranam-muted hover:text-kiranam-ink'
  }`;
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export function badgeClass(tone: BadgeTone) {
  switch (tone) {
    case 'success':
      return 'inline-flex items-center gap-1.5 rounded-full bg-kiranam-success-soft px-3 py-1 text-xs font-semibold text-kiranam-success whitespace-nowrap';
    case 'warning':
      return 'inline-flex items-center gap-1.5 rounded-full bg-kiranam-warning-soft px-3 py-1 text-xs font-semibold text-kiranam-warning whitespace-nowrap';
    case 'danger':
      return 'inline-flex items-center gap-1.5 rounded-full bg-kiranam-danger-soft px-3 py-1 text-xs font-semibold text-kiranam-danger whitespace-nowrap';
    case 'neutral':
    default:
      return 'inline-flex items-center gap-1.5 rounded-full bg-kiranam-surface-alt px-3 py-1 text-xs font-semibold text-kiranam-muted whitespace-nowrap';
  }
}

/** Inline style for staggered list/table entrance — pair with the `animate-stagger-in` class
 * already baked into `tableRowClass` (or add it explicitly elsewhere). Index-based delay,
 * capped so long lists don't take forever to finish revealing. */
export function staggerDelay(index: number, stepMs = 35, capIndex = 12): CSSProperties {
  return { animationDelay: `${Math.min(index, capIndex) * stepMs}ms` };
}

export function formatMoney(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}
