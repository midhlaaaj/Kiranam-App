import { Skeleton, SkeletonRegion } from '@/components/whatsapp/ui/skeleton'

/**
 * Loading placeholder for the two half-width summary cards (spend, sending
 * limits): icon disc, label, headline number, supporting line and — for the
 * spend card — a short breakdown list. Sized like the loaded cards so the row
 * doesn't jump when the data arrives.
 */
export function SummaryCardSkeleton({ rows = 2, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <SkeletonRegion label={label} className="rounded-lg border border-border bg-card p-5 shadow-elevation-md">
      <div className="flex items-start gap-4">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-44 max-w-full" />
          <Skeleton className="mt-2.5 h-7 w-28" />
          <Skeleton className="mt-3 h-3 w-64 max-w-full" />
        </div>
      </div>
      {rows > 0 && (
        <div className="mt-5 space-y-2 border-t border-border pt-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}
    </SkeletonRegion>
  )
}
