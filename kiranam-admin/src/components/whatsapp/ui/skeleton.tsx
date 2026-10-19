import { cn } from '@/lib/whatsapp/utils'

// Shared loading skeletons for every /whatsapp page. Built from the WhatsApp
// section's own tokens (bg-muted, border-border, bg-card) so they match the
// real content in light and dark mode, and sized to the real layouts so the
// page doesn't jump when data arrives. `motion-reduce` turns the pulse off.

/** A pulsing block sized by its className. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)} />
}

/** Announces "loading" to screen readers once for the whole skeleton region. */
export function SkeletonRegion({ label = 'Loading', className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** Page title + description (+ optional action button), like the real page headers. */
export function SkeletonPageHeader({ withAction = false, withDescription = true }: { withAction?: boolean; withDescription?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <Skeleton className="h-8 w-48 max-w-full" />
        {withDescription && <Skeleton className="mt-2 h-4 w-80 max-w-full" />}
      </div>
      {withAction && <Skeleton className="h-9 w-36 rounded-lg" />}
    </div>
  )
}

/** Icon disc + label + number, like the dashboard metric cards. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-5 shadow-elevation-md', className)}>
      <Skeleton className="mb-3 h-9 w-9 rounded-full" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  )
}

/**
 * Column visibility by index, mirroring how the real tables collapse: the first
 * two columns always show (name + status on a phone), the next three from `sm`,
 * the rest from `lg`. Cells flex to share the row, so nothing is wider than the
 * viewport at 360px.
 */
const colVisibility = (c: number) => (c < 2 ? '' : c < 5 ? 'hidden sm:block' : 'hidden lg:block')

/** A bordered table with a header row and `rows` body rows of `cols` cells. */
export function SkeletonTable({ rows = 6, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card shadow-elevation-md', className)}>
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className={cn('min-w-0', c === 0 ? 'flex-[2]' : 'flex-1', colVisibility(c))}>
            <Skeleton className={cn('h-3 max-w-full', c === 0 ? 'w-32' : 'w-16')} />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={cn('min-w-0', c === 0 ? 'flex-[2]' : 'flex-1', colVisibility(c))}>
              <Skeleton className={cn('h-4 max-w-full', c === 0 ? 'w-40' : 'w-14')} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Avatar + two lines, repeated — conversation lists, activity feeds, member lists. */
export function SkeletonList({ rows = 6, avatar = true, className }: { rows?: number; avatar?: boolean; className?: string }) {
  return (
    <div className={cn('divide-y divide-border rounded-lg border border-border bg-card shadow-elevation-md', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          {avatar && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A titled panel with a few form-field rows — settings and edit screens. */
export function SkeletonPanel({ fields = 3, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-5 shadow-elevation-md', className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3 w-72 max-w-full" />
      <div className="mt-5 space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
