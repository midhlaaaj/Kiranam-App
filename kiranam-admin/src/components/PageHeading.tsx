import { Suspense } from 'react';
import { NotificationBell } from './NotificationBell';
import { SkeletonBell } from './Skeleton';

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kiranam-border pb-5 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance text-kiranam-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-kiranam-muted">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {/* Own Suspense boundary so this async DB-backed component never
            blocks the title/action above from rendering immediately. */}
        <Suspense fallback={<SkeletonBell />}>
          <NotificationBell />
        </Suspense>
      </div>
    </div>
  );
}
