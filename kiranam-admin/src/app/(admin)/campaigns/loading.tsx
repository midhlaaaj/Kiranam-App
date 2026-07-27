import { Skeleton, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kiranam-border pb-5 mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-56 rounded-full" />
        <Skeleton className="h-9 w-56 rounded-lg" />
      </div>
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
