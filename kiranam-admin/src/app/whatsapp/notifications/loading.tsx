import { Skeleton, SkeletonPageHeader, SkeletonRegion } from '@/components/whatsapp/ui/skeleton'

// Route-level loading state for Alerts: page header, then notification rows
// shaped like the real ones (icon tile, title, preview, time).
export default function NotificationsLoading() {
  return (
    <SkeletonRegion label="Loading alerts" className="space-y-6">
      <SkeletonPageHeader withAction />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}
