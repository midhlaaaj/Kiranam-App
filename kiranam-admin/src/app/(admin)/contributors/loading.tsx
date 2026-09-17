import { Skeleton, SkeletonPageHeading, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-40" descriptionWidth="w-96" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 rounded-full" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>
      </div>
      <SkeletonTable rows={7} cols={5} />
    </div>
  );
}
