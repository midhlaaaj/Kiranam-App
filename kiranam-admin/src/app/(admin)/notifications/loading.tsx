import { Skeleton, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kiranam-border pb-5 mb-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>
      <SkeletonTable rows={4} cols={5} />
    </div>
  );
}
