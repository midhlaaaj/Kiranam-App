import { Skeleton, SkeletonChart, SkeletonPageHeading, SkeletonTable } from '@/components/Skeleton';

// Mirrors the real page: heading, filter bar, three totals, chart, table.
export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-40" descriptionWidth="w-72" withAction />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="mt-5 mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="col-span-2 h-20 rounded-lg sm:col-span-1" />
      </div>
      <div className="space-y-4">
        <SkeletonChart />
        <SkeletonTable rows={7} cols={6} />
      </div>
    </div>
  );
}
