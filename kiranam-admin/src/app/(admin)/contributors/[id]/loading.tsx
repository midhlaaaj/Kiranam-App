import { Skeleton, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-5 w-32" />
      <div className="mt-2 border-b border-kiranam-border pb-5 lg:pr-14">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Skeleton className="mb-4 h-7 w-48" />
          <SkeletonTable rows={5} cols={4} />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
