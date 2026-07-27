import Link from 'next/link';
import { pillTabItemClass } from '@/lib/ui';

export function Pagination({
  page,
  hasNext,
  buildHref,
}: {
  page: number;
  hasNext: boolean;
  buildHref: (page: number) => string;
}) {
  if (page === 1 && !hasNext) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-kiranam-muted">Page {page}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className={pillTabItemClass(false)}>
            Previous
          </Link>
        ) : (
          <span className={`${pillTabItemClass(false)} cursor-not-allowed opacity-40`}>Previous</span>
        )}
        {hasNext ? (
          <Link href={buildHref(page + 1)} className={pillTabItemClass(false)}>
            Next
          </Link>
        ) : (
          <span className={`${pillTabItemClass(false)} cursor-not-allowed opacity-40`}>Next</span>
        )}
      </div>
    </div>
  );
}
