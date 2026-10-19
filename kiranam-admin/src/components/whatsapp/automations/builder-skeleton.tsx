import { Skeleton, SkeletonRegion } from '@/components/whatsapp/ui/skeleton'

/**
 * Loading placeholder for the automation builder (new + edit). Mirrors the
 * builder's full-screen layout — top bar (back, name, Active switch, Save)
 * over a centred canvas with the trigger card and a couple of step cards —
 * so nothing shifts when the real builder mounts.
 */
export function AutomationBuilderSkeleton() {
  return (
    <SkeletonRegion label="Loading automation" className="fixed inset-0 flex flex-col bg-background">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 py-3 sm:gap-3 sm:px-4">
        <Skeleton className="h-9 w-9 flex-shrink-0 rounded-md" />
        <Skeleton className="h-6 min-w-0 flex-1 sm:max-w-sm" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="hidden h-4 w-10 sm:block" />
          <Skeleton className="h-5 w-9 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 py-10">
          <SkeletonStepCard tall />
          <Connector />
          <SkeletonStepCard />
          <Connector />
          <SkeletonStepCard />
        </div>
      </div>
    </SkeletonRegion>
  )
}

function Connector() {
  return <div aria-hidden className="h-6 w-px bg-border" />
}

function SkeletonStepCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className="w-full rounded-lg border border-border bg-card p-4 shadow-elevation-md">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      {tall && <Skeleton className="mt-4 h-9 w-full rounded-lg" />}
    </div>
  )
}
