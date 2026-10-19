import { Skeleton, SkeletonRegion } from '@/components/whatsapp/ui/skeleton'

/**
 * Loading placeholder for the flow editor. Mirrors FlowEditorShell's
 * breakpoints: below 768px the real editor has no view toggle and shows the
 * list view (stacked step cards); from md up it shows the Canvas/List toggle
 * and the canvas stage, with the node-type legend only from lg.
 */
export function FlowEditorSkeleton() {
  return (
    <SkeletonRegion label="Loading flow" className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Toolbar: back · name · status on the left, actions on the right. On a
          phone only the primary action is kept so nothing is wider than the screen. */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        <Skeleton className="h-6 min-w-0 flex-1 sm:w-48 sm:flex-none" />
        <Skeleton className="hidden h-5 w-16 shrink-0 rounded-full sm:block" />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Skeleton className="hidden h-9 w-20 rounded-md sm:block" />
          <Skeleton className="h-9 w-20 rounded-md sm:w-24" />
        </div>
      </div>

      {/* View toggle (md+) and legend (lg+) */}
      <div className="hidden items-center gap-4 px-6 py-3.5 md:flex">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <div className="ml-auto hidden gap-3 lg:flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-14" />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-4 pb-4 pt-4 sm:px-6 md:pt-0">
        {/* Phone: list view — stacked step cards */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 max-w-full" />
                  <Skeleton className="h-3 w-3/4 max-w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* md+: canvas stage */}
        <div className="hidden h-full min-h-[24rem] flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 md:flex">
          <Skeleton className="h-16 w-56 max-w-full rounded-lg" />
          <Skeleton className="h-6 w-px rounded-none" />
          <div className="flex max-w-full gap-6">
            <Skeleton className="h-16 w-48 rounded-lg" />
            <Skeleton className="h-16 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-px rounded-none" />
          <Skeleton className="h-16 w-56 max-w-full rounded-lg" />
        </div>
      </div>
    </SkeletonRegion>
  )
}
