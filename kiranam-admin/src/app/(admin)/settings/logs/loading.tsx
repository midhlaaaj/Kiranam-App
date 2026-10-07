import { Skeleton, SkeletonTable } from '@/components/Skeleton';

// Renders inside settings/layout.tsx — heading + tabs are already on screen.
// Mirrors the real filter toolbar (search + three pill filters) so it doesn't jump.
export default function Loading() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <SkeletonTable rows={8} cols={4} />
    </div>
  );
}
