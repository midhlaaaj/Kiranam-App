import { Skeleton, SkeletonRegion } from '@/components/whatsapp/ui/skeleton'
import { TableCell, TableRow } from '@/components/whatsapp/ui/table'

/**
 * Body rows for the contacts table while it loads. One cell per real column,
 * with the same responsive `hidden md/lg:table-cell` rules, so the table keeps
 * its width and the columns line up once the data arrives.
 */
export function ContactRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      <TableRow className="border-0 hover:bg-transparent">
        <TableCell colSpan={8} className="sr-only p-0">
          <span role="status">Loading contacts</span>
        </TableCell>
      </TableRow>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="border-border" aria-hidden>
          <TableCell>
            <Skeleton className="size-4 rounded" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 max-w-full sm:w-36" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20 max-w-full sm:w-28" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            <Skeleton className="h-3 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="size-7 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

/** The contact side sheet: avatar + name header, tab strip, a few detail rows. */
export function ContactDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading contact" className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 p-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="flex gap-2 border-b border-border/50 px-4 py-2">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
      <div className="space-y-4 px-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}

/** Note cards while a contact's notes load. */
export function NotesSkeleton() {
  return (
    <SkeletonRegion label="Loading notes" className="space-y-2">
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </SkeletonRegion>
  )
}

/** Label + input rows (custom fields on a contact, or the custom-field list). */
export function FieldRowsSkeleton({ rows = 3, label = 'Loading fields' }: { rows?: number; label?: string }) {
  return (
    <SkeletonRegion label={label} className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </SkeletonRegion>
  )
}

/**
 * Whole-page skeleton for the contacts route. Mirrors the real page at every
 * width: on phones the table shows only checkbox / name / phone / actions, the
 * email + tags columns appear from `md`, company + date from `lg` — same as
 * the real table — and each cell is shrinkable so nothing overflows 360px.
 */
export function ContactsPageSkeleton() {
  const bar = (w: string, extra = '') => <Skeleton className={`h-4 max-w-full ${w} ${extra}`} />
  return (
    <SkeletonRegion label="Loading contacts" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-full rounded-lg sm:max-w-sm" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-elevation-md">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="hidden h-3 w-14 md:block" />
          <Skeleton className="hidden h-3 w-16 lg:block" />
          <Skeleton className="hidden h-3 w-12 md:block" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0">
            <Skeleton className="size-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1">{bar('w-32')}</div>
            <div className="min-w-0 flex-1">{bar('w-24')}</div>
            <div className="hidden min-w-0 flex-1 md:block">{bar('w-36')}</div>
            <div className="hidden min-w-0 flex-1 lg:block">{bar('w-20')}</div>
            <div className="hidden min-w-0 flex-1 md:block">
              <Skeleton className="h-5 w-20 max-w-full rounded-full" />
            </div>
            <Skeleton className="size-7 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}
