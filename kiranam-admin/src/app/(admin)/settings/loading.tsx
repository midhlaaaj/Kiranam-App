import { PageHeading } from '@/components/PageHeading';
import { Skeleton, SkeletonForm, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <PageHeading title="Settings" />
      <Skeleton className="mt-4 h-9 w-64" />
      <div className="mt-6">
        <SkeletonForm fields={1} />
      </div>
      <div className="mt-6">
        <SkeletonTable rows={4} cols={4} />
      </div>
    </div>
  );
}
