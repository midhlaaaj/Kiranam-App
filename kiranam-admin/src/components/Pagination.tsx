import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonSecondary } from '@/lib/ui';
import { cn } from '@/lib/utils';

const navClass = cn(buttonSecondary, 'h-9 px-3 py-0');

/** Prev/Next pager. Pass `total` + `pageSize` to show "26–50 of 340"
 * (preferred); without them it falls back to "Page N". */
export function Pagination({
  page,
  hasNext,
  buildHref,
  total,
  pageSize,
  noun = 'results',
}: {
  page: number;
  hasNext: boolean;
  buildHref: (page: number) => string;
  total?: number | null;
  pageSize?: number;
  /** Plural noun for the range text, e.g. "actions". */
  noun?: string;
}) {
  if (page === 1 && !hasNext) return null;

  const hasCount = typeof total === 'number' && !!pageSize;
  const first = hasCount ? (page - 1) * pageSize! + 1 : 0;
  const last = hasCount ? Math.min(page * pageSize!, total!) : 0;

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-kiranam-muted" aria-live="polite">
        {hasCount ? (
          <>
            Showing <span className="font-semibold text-kiranam-ink tabular-nums">{first.toLocaleString('en-IN')}–{last.toLocaleString('en-IN')}</span> of{' '}
            <span className="font-semibold text-kiranam-ink tabular-nums">{total!.toLocaleString('en-IN')}</span> {noun}
          </>
        ) : (
          <>Page {page}</>
        )}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={navClass} rel="prev">
            <ChevronLeft size={16} aria-hidden />
            Previous
          </Link>
        ) : (
          <span className={cn(navClass, 'pointer-events-none opacity-40')} aria-disabled="true">
            <ChevronLeft size={16} aria-hidden />
            Previous
          </span>
        )}
        {hasNext ? (
          <Link href={buildHref(page + 1)} className={navClass} rel="next">
            Next
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : (
          <span className={cn(navClass, 'pointer-events-none opacity-40')} aria-disabled="true">
            Next
            <ChevronRight size={16} aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
