import { SkeletonPageHeading, SkeletonTable } from '@/components/Skeleton';

// Fallback for any admin page whose own loading.tsx hasn't been prefetched
// yet — common on phones, where the nav links sit in a closed drawer and
// never enter the viewport. Deliberately neutral (heading + a list card)
// instead of the Overview dashboard skeleton, which lives in
// (overview)/loading.tsx so it only ever shows for the Overview page.
export default function Loading() {
  return (
    <div>
      <SkeletonPageHeading titleWidth="w-40" />
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
