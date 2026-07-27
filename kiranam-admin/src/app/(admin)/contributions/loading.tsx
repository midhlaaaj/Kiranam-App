import { PageHeading } from '@/components/PageHeading';
import { Skeleton, SkeletonChart, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <PageHeading title="Contributions" />
      <Skeleton className="mb-6 h-9 w-96 rounded-full" />
      <div className="space-y-4">
        <SkeletonChart />
        <SkeletonTable rows={7} cols={6} />
      </div>
    </div>
  );
}
