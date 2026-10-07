import { Skeleton, SkeletonPageHeading, SkeletonTable } from '@/components/Skeleton';

// Heading, the collapsed "Send new" button, then the Sent list.
export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-48" descriptionWidth="w-96" />
      <Skeleton className="h-10 w-32 rounded-lg" />
      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
