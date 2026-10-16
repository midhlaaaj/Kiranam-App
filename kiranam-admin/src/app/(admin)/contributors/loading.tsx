import { SkeletonPageHeading, SkeletonTable, SkeletonToolbar } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-40" mobileAction />
      <SkeletonToolbar action="w-44" compactOnMobile />
      <SkeletonTable rows={7} cols={5} />
    </div>
  );
}
