import { SkeletonPageHeading, SkeletonTable, SkeletonToolbar } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-40" />
      <SkeletonToolbar searchWidth="w-64" action="w-44" />
      <SkeletonTable rows={7} cols={5} />
    </div>
  );
}
