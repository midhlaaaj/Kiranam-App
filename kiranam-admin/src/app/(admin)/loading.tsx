import { SkeletonChart, SkeletonPageHeading, SkeletonStatRow } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-36" />
      <div className="mt-6">
        <SkeletonStatRow count={5} />
      </div>
      <div className="mt-6">
        <SkeletonChart />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className="mt-6">
        <SkeletonChart />
      </div>
    </div>
  );
}
