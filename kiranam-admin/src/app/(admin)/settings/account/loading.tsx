import { SkeletonCard } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-2xl space-y-6">
      <SkeletonCard lines={4} />
      <SkeletonCard lines={1} />
      <SkeletonCard lines={1} />
    </div>
  );
}
