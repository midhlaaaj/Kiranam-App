import { PageHeading } from '@/components/PageHeading';
import { Skeleton, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <PageHeading title="Contributors" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 rounded-full" />
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <SkeletonTable rows={7} cols={4} />
    </div>
  );
}
