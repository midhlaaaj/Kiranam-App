import { SkeletonPageHeading, SkeletonTable, SkeletonToolbar } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-40" />
      <SkeletonToolbar action="w-44" />
      <SkeletonTable rows={5} cols={4} avatar actions />
    </div>
  );
}
