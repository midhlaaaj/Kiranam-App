import { SkeletonPageHeading, SkeletonTable, SkeletonToolbar } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-32" />
      <SkeletonToolbar searchWidth="w-64" action="w-36" />
      <SkeletonTable rows={5} cols={4} avatar actions />
    </div>
  );
}
