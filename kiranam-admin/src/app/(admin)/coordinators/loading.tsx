import { SkeletonPageHeading, SkeletonTable, SkeletonToolbar } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-32" />
      <SkeletonToolbar action="w-40" />
      <SkeletonTable rows={7} cols={4} />
    </div>
  );
}
