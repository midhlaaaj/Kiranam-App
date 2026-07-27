import { Skeleton, SkeletonStatRow, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-3 h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="mt-6">
        <SkeletonStatRow count={3} />
      </div>
      <Skeleton className="mt-8 h-5 w-48" />
      <div className="mt-3">
        <SkeletonTable rows={5} cols={4} />
      </div>
    </div>
  );
}
