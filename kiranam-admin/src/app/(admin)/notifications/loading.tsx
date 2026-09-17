import { Skeleton, SkeletonPageHeading, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-40" descriptionWidth="w-96" withAction />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
