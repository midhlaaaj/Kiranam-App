import { Skeleton, SkeletonPageHeading, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-32" />
      <Skeleton className="mt-4 h-9 w-64" />
      <div className="mt-6">
        <SkeletonTable rows={5} cols={5} />
      </div>
    </div>
  );
}
