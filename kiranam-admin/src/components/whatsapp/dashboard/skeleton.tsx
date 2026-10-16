import { cn } from '@/lib/whatsapp/utils'

/**
 * Shared skeleton primitive — a pulsing slate block sized to whatever
 * container it's dropped into. Used by every dashboard widget while
 * its data fetches.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card shadow-elevation-md p-5',
        className,
      )}
    >
      <Skeleton className="mb-3 h-9 w-9 rounded-full" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  )
}
