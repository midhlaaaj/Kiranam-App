import { Skeleton, SkeletonPageHeading } from '@/components/Skeleton';
import { cardClass } from '@/lib/ui';

export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-44" descriptionWidth="w-32" withAction />
      <div className={`${cardClass} divide-y divide-kiranam-border`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-full max-w-md" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
