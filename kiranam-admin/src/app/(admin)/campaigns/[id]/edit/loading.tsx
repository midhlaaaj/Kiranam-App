import { Skeleton, SkeletonForm } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-7 w-44" />
      <div className="mt-6">
        <SkeletonForm fields={6} />
      </div>
    </div>
  );
}
