import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/Skeleton';

// Invite form, pending invites, admins — each under its own heading.
export default function Loading() {
  return (
    <div className="grid gap-10">
      <section>
        <Skeleton className="mb-3 h-6 w-36" />
        <SkeletonCard lines={1} className="max-w-xl" />
      </section>
      <section>
        <Skeleton className="mb-3 h-6 w-36" />
        <SkeletonTable rows={2} cols={4} />
      </section>
      <section>
        <Skeleton className="mb-3 h-6 w-24" />
        <SkeletonTable rows={4} cols={5} />
      </section>
    </div>
  );
}
