import { Skeleton, SkeletonForm } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-7 w-44" />
      <div className="mt-6">
        <SkeletonForm groups={[2, 3, 2]} />
      </div>
    </div>
  );
}
