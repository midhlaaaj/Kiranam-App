import { Skeleton, SkeletonCard, SkeletonList, SkeletonPageHeader, SkeletonRegion } from '@/components/whatsapp/ui/skeleton'
import { SummaryCardSkeleton } from '@/components/whatsapp/dashboard/summary-card-skeleton'

// Shown while the dashboard route itself loads (before the page's own
// per-widget skeletons take over). Mirrors the real layout: header, four
// metric cards, the two summary cards, then the charts and activity feed.
export default function DashboardLoading() {
  return (
    <SkeletonRegion label="Loading dashboard" className="space-y-5">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryCardSkeleton rows={2} />
        <SummaryCardSkeleton rows={0} />
      </div>
      <div className="rounded-lg border border-border bg-card p-5 shadow-elevation-md">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-5 h-[240px] w-full" />
      </div>
      <SkeletonList rows={5} />
    </SkeletonRegion>
  )
}
