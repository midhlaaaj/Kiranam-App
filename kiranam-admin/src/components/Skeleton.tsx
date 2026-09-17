import { cardClass } from '@/lib/ui';

/** Base shimmer block. Degrades to a static tint under prefers-reduced-motion (see globals.css). */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={`animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--color-kiranam-surface-alt)_25%,var(--color-kiranam-border)_37%,var(--color-kiranam-surface-alt)_63%)] bg-[length:400%_100%] ${className}`}
    />
  );
}

/** Placeholder for the circular NotificationBell while it streams in behind
 * its own Suspense boundary (see PageHeading / AddNewPanel) — kept as a
 * standalone export so loading.tsx files can match its exact dimensions. */
export function SkeletonBell() {
  return <Skeleton className="h-10 w-10 rounded-full" />;
}

/** Matches PageHeading / AddNewPanel's title row (title + optional action
 * button + the red circular NotificationBell) for the brief window before
 * the real page.tsx itself has returned anything — once it has, the title
 * and toolbar render immediately and only NotificationBell (Suspense-wrapped
 * in PageHeading/AddNewPanel) shows this bell placeholder on its own. */
export function SkeletonPageHeading({
  titleWidth = 'w-40',
  withAction = false,
  descriptionWidth,
}: {
  titleWidth?: string;
  withAction?: boolean;
  /** Set when the real AddNewPanel/PageHeading on this page passes a
   * `description` — otherwise the title bar is a row shorter than the real
   * one and the header height jumps once it mounts. */
  descriptionWidth?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kiranam-border pb-5 mb-6">
      <div>
        <Skeleton className={`h-8 ${titleWidth}`} />
        {descriptionWidth && <Skeleton className={`mt-2 h-4 ${descriptionWidth}`} />}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {withAction && <Skeleton className="h-10 w-36 rounded-lg" />}
        <SkeletonBell />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className={`${cardClass} p-5`}>
      <Skeleton className="mb-3 h-9 w-9 rounded-full" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-16" />
    </div>
  );
}

export function SkeletonStatRow({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 6,
  cols = 4,
  avatar = false,
  actions = false,
}: {
  rows?: number;
  cols?: number;
  /** Row-leading circular thumbnail, matching Campaigns/Events/Contributors
   * tables that pair a cover image with the title. */
  avatar?: boolean;
  /** Trailing pair of icon-button placeholders instead of a generic bar,
   * matching the edit/delete icon columns those same tables end with. */
  actions?: boolean;
}) {
  const textCols = actions ? cols - 1 : cols;
  return (
    <div className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center gap-6 border-b border-kiranam-border px-5 py-3">
        {avatar && <Skeleton className="h-3 w-10 shrink-0" />}
        {Array.from({ length: textCols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
        {actions && <Skeleton className="ml-auto h-3 w-12" />}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-kiranam-border px-5 py-4 last:border-0">
          {avatar && <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />}
          {Array.from({ length: textCols }).map((_, j) => (
            <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-32' : 'w-16'}`} />
          ))}
          {actions && (
            <div className="ml-auto flex shrink-0 gap-1">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({
  fields = 3,
  groups,
}: {
  /** Flat field count — used when the real form has no section headers. */
  fields?: number;
  /** Field count per section — matches forms built with FieldGroup (campaign
   * & event edit pages: Details / Funding / Media, etc). Each section gets a
   * small uppercase-label bar above its fields, and a divider below except
   * the last, mirroring FieldGroup's own border-b treatment. Overrides `fields`. */
  groups?: number[];
}) {
  if (groups) {
    return (
      <div className={`${cardClass} max-w-xl p-5`}>
        {groups.map((count, g) => (
          <div key={g} className={`grid gap-3 ${g === groups.length - 1 ? '' : 'mb-5 border-b border-kiranam-border pb-5'}`}>
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ))}
        <Skeleton className="mt-5 h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={`${cardClass} grid max-w-xl gap-3 p-5`}>
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
      <Skeleton className="h-10 w-28" />
    </div>
  );
}

export function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <div className={`${cardClass} p-5`}>
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="w-full" style={{ height }} />
    </div>
  );
}
