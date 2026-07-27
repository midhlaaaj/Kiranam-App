import { Skeleton, SkeletonStatRow } from '@/components/Skeleton';
import { cardClass } from '@/lib/ui';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-3 h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-8 h-5 w-40" />
      <div className="mt-3">
        <SkeletonStatRow count={6} />
      </div>
      <Skeleton className="mt-8 h-5 w-56" />
      <div className={`mt-3 ${cardClass} p-5`}>
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
