import { PageHeading } from '@/components/PageHeading';
import { Skeleton, SkeletonTable } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <PageHeading title="Settings" description="Most recent admin actions." />
      <div className="mb-6 flex gap-6 border-b border-kiranam-border">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-12" />
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-44" />
      </div>
      <SkeletonTable rows={8} cols={4} />
    </div>
  );
}
