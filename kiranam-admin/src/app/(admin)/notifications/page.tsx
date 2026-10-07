import { Suspense } from 'react';
import { History } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/EmptyState';
import { PageHeading } from '@/components/PageHeading';
import { Pagination } from '@/components/Pagination';
import { PillTabs } from '@/components/PillTabs';
import { Skeleton, SkeletonTable } from '@/components/Skeleton';
import { NotificationsForm } from './NotificationsForm';
import { formatDateTime, formatDateTimeFull } from '@/lib/format';
import { badgeClass, cardClass, tableCellClass, tableHeadRowClass, tableWrapClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 15;

interface SentAnnouncement {
  id: string;
  createdAt: string;
  title: string;
  body: string | null;
  audience: string;
  count: number;
  read: number | null;
  sentBy: string;
}

// Sent history comes from the audit log: exactly one `send_announcement`
// row per send, recording the audience chosen at send time. (Grouping raw
// notification rows by timestamp split each send into one row per person.)
async function getSentHistory(audience: string | undefined, page: number) {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from('admin_audit_log')
    .select('id, created_at, details, profiles!admin_audit_log_admin_id_fkey(full_name, email)', { count: 'exact' })
    .eq('action', 'send_announcement')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (audience) query = query.eq('details->>audience', audience);
  const { data, count } = await query;

  const rows = (data || []) as unknown as {
    id: string;
    created_at: string;
    details: Record<string, unknown> | null;
    profiles: { full_name: string | null; email: string | null } | null;
  }[];

  // Read rate: notification rows with this title written in the minutes
  // leading up to the log entry (which is written once the send finishes).
  const history: SentAnnouncement[] = await Promise.all(
    rows.map(async (r) => {
      const d = r.details || {};
      const title = typeof d.title === 'string' ? d.title : 'Untitled';
      const end = new Date(new Date(r.created_at).getTime() + 60_000).toISOString();
      const start = new Date(new Date(r.created_at).getTime() - 30 * 60_000).toISOString();
      // Announcements are deleted 30 days after sending (to keep the
      // database small), so an older send has no read data any more.
      if (Date.now() - new Date(r.created_at).getTime() > 30 * 86_400_000) {
        return {
          id: r.id,
          createdAt: r.created_at,
          title,
          body: typeof d.body === 'string' ? d.body : null,
          audience: typeof d.audience === 'string' ? d.audience : 'contributor',
          count: typeof d.count === 'number' ? d.count : 0,
          read: null,
          sentBy: r.profiles?.full_name || r.profiles?.email || 'Unknown',
        };
      }
      const { count: read } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'broadcast')
        .eq('title', title)
        .eq('is_read', true)
        .gte('created_at', start)
        .lte('created_at', end);
      return {
        id: r.id,
        createdAt: r.created_at,
        title,
        body: typeof d.body === 'string' ? d.body : null,
        audience: typeof d.audience === 'string' ? d.audience : 'contributor',
        count: typeof d.count === 'number' ? d.count : 0,
        read: read ?? null,
        sentBy: r.profiles?.full_name || r.profiles?.email || 'Unknown',
      };
    })
  );

  return { history, total: count ?? 0 };
}

async function getAudienceCounts() {
  const supabase = await createClient();
  const [c, v] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'contributor'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'volunteer'),
  ]);
  return { contributor: c.count ?? 0, volunteer: v.count ?? 0, all: (c.count ?? 0) + (v.count ?? 0) };
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; page?: string }>;
}) {
  const { audience: audienceParam, page: pageParam } = await searchParams;
  const audience = audienceParam === 'contributor' || audienceParam === 'volunteer' ? audienceParam : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  return (
    <div>
      <PageHeading
        title="Announcements"
        description="Send a push notification to contributors, volunteers, or everyone in the Kiranam app. Announcements clear from people's in-app inbox after 30 days."
      />

      <Suspense fallback={<Skeleton className={cn(cardClass, 'h-96 max-w-3xl')} />}>
        <Composer />
      </Suspense>

      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Sent</h2>
        <PillTabs
          label="Sent to"
          items={[
            { key: 'all', label: 'All', href: '/notifications', active: !audience, scroll: false },
            {
              key: 'contributor',
              label: 'To contributors',
              href: '/notifications?audience=contributor',
              active: audience === 'contributor',
              scroll: false,
            },
            {
              key: 'volunteer',
              label: 'To volunteers',
              href: '/notifications?audience=volunteer',
              active: audience === 'volunteer',
              scroll: false,
            },
          ]}
        />
      </div>

      <Suspense key={`${audience}:${page}`} fallback={<SkeletonTable rows={5} cols={4} />}>
        <SentHistoryTable audience={audience} page={page} />
      </Suspense>
    </div>
  );
}

async function Composer() {
  const counts = await getAudienceCounts();
  return <NotificationsForm counts={counts} />;
}

async function SentHistoryTable({ audience, page }: { audience?: string; page: number }) {
  const { history, total } = await getSentHistory(audience, page);

  if (history.length === 0) {
    return (
      <div className={tableWrapClass}>
        <EmptyState
          icon={History}
          title={audience ? `No announcements sent to ${audience}s yet` : 'No announcements sent yet'}
          description="Announcements you send above will be listed here with how many people read them."
        />
      </div>
    );
  }

  return (
    <>
      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Announcement</th>
              <th className={tableCellClass}>Sent to</th>
              <th className={cn(tableCellClass, 'w-48')}>Read</th>
              <th className={cn(tableCellClass, 'hidden md:table-cell')}>Sent</th>
            </tr>
          </thead>
          <tbody>
            {history.map((b) => {
              const pct = b.read !== null && b.count > 0 ? Math.min(100, Math.round((b.read / b.count) * 100)) : null;
              return (
                <tr key={b.id} className="border-b border-kiranam-border align-top last:border-0">
                  <td className={tableCellClass}>
                    {b.body ? (
                      <details className="group">
                        <summary className="cursor-pointer list-none font-semibold text-kiranam-ink marker:hidden">
                          {b.title}
                          <span className="ml-2 text-xs font-normal text-kiranam-muted group-open:hidden">Show message</span>
                        </summary>
                        <p className="mt-1.5 max-w-prose whitespace-pre-line text-kiranam-ink">{b.body}</p>
                      </details>
                    ) : (
                      <span className="font-semibold text-kiranam-ink">{b.title}</span>
                    )}
                    <p className="mt-0.5 text-xs text-kiranam-muted md:hidden">{formatDateTime(b.createdAt)}</p>
                  </td>
                  <td className={cn(tableCellClass, 'whitespace-nowrap')}>
                    <span className={badgeClass('neutral')}>
                      {b.count.toLocaleString('en-IN')}{' '}
                      {b.audience === 'all' ? (b.count === 1 ? 'person' : 'people') : `${b.audience}${b.count === 1 ? '' : 's'}`}
                    </span>
                  </td>
                  <td className={tableCellClass}>
                    {pct === null ? (
                      <span className="text-kiranam-muted">—</span>
                    ) : (
                      <div className="grid gap-1">
                        <span className="tabular-nums text-kiranam-ink">
                          <span className="font-semibold">{pct}%</span>{' '}
                          <span className="text-kiranam-muted">
                            ({b.read} of {b.count})
                          </span>
                        </span>
                        <span className="h-1.5 w-full overflow-hidden rounded-full bg-kiranam-surface-alt" aria-hidden>
                          <span className="block h-full rounded-full bg-kiranam-ink/70" style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    )}
                  </td>
                  <td className={cn(tableCellClass, 'hidden whitespace-nowrap text-kiranam-muted md:table-cell')}>
                    <time dateTime={b.createdAt} title={formatDateTimeFull(b.createdAt)}>
                      {formatDateTime(b.createdAt)}
                    </time>
                    <p className="text-xs">by {b.sentBy}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        hasNext={page * PAGE_SIZE < total}
        total={total}
        pageSize={PAGE_SIZE}
        noun="announcements"
        buildHref={(p) => `/notifications?${new URLSearchParams({ ...(audience ? { audience } : {}), page: String(p) })}`}
      />
    </>
  );
}
