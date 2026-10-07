import { SkeletonCard } from '@/components/Skeleton';

// Renders under settings/layout.tsx (heading + tabs already on screen).
export default function Loading() {
  return <SkeletonCard lines={3} className="max-w-2xl" />;
}
