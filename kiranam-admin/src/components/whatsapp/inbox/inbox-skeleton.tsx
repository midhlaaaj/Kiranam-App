import { Skeleton, SkeletonRegion } from '@/components/whatsapp/ui/skeleton'
import { cn } from '@/lib/whatsapp/utils'

/** Conversation rows — same anatomy as a ConversationItem (avatar, name + time, preview). */
export function ConversationListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <SkeletonRegion label="Loading conversations">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-full opacity-70" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  )
}

/** Alternating incoming/outgoing chat bubbles while a thread loads. */
export function MessageThreadSkeleton() {
  const bubbles = [
    { out: false, w: 'w-56' },
    { out: true, w: 'w-64' },
    { out: false, w: 'w-40' },
    { out: true, w: 'w-72' },
    { out: false, w: 'w-52' },
  ]
  return (
    <SkeletonRegion label="Loading messages" className="space-y-3 py-2">
      {bubbles.map((b, i) => (
        <div key={i} className={cn('flex', b.out ? 'justify-end' : 'justify-start')}>
          <Skeleton className={cn('h-10 max-w-[75%] rounded-2xl', b.w)} />
        </div>
      ))}
    </SkeletonRegion>
  )
}

/**
 * Whole-page placeholder for the inbox route (Suspense fallback while the
 * route's search-params boundary resolves): list panel on the left, thread
 * area on the right, matching the real two-pane layout.
 */
export function InboxPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden" aria-busy="true">
      <div className="flex h-full w-full flex-col border-r border-border bg-card lg:w-80">
        <div className="space-y-3 border-b border-border p-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
        <ConversationListSkeleton />
      </div>
      <div className="hidden min-w-0 flex-1 flex-col lg:flex">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex-1 px-4 py-4">
          <MessageThreadSkeleton />
        </div>
      </div>
    </div>
  )
}
