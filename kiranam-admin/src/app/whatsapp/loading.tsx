import {
  SkeletonCard,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonRegion,
  SkeletonTable,
} from '@/components/whatsapp/ui/skeleton';

// Fallback while any /whatsapp route segment is loading (navigation between
// pages, before a page's own client-side skeleton takes over). Pages that
// have a more specific layout provide their own loading.tsx, which wins.
// Mobile: one column of cards, and a stacked list instead of a table (a
// 4-column table skeleton is wider than a 360px screen).
export default function WhatsAppLoading() {
  return (
    <SkeletonRegion label="Loading" className="space-y-6">
      <SkeletonPageHeader withAction />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonList rows={5} className="md:hidden" />
      <SkeletonTable rows={5} cols={4} className="hidden md:block" />
    </SkeletonRegion>
  );
}
