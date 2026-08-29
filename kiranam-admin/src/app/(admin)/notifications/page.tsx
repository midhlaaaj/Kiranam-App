import { Suspense } from 'react';
import { History } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/EmptyState';
import { AddNewPanel } from '@/components/AddNewPanel';
import { NotificationsForm } from './NotificationsForm';
import { SkeletonTable } from '@/components/Skeleton';
import { PillTabs } from '@/components/PillTabs';
import {
  staggerDelay,
  tableCellClass,
  tableCellNumClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

interface Broadcast {
  key: string;
  title: string;
  body: string;
  createdAt: string;
  audience: string;
  recipientCount: number;
  readCount: number;
}

async function getSentHistory(): Promise<Broadcast[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('title, body, created_at, is_read, profiles!notifications_profile_id_fkey(role)')
    .eq('category', 'broadcast')
    .order('created_at', { ascending: false })
    .limit(500);

  const byBroadcast = new Map<string, Broadcast>();
  (data || []).forEach((row) => {
    const key = `${row.title}|${row.body}|${row.created_at}`;
    const existing = byBroadcast.get(key);
    if (existing) {
      existing.recipientCount += 1;
      if (row.is_read) existing.readCount += 1;
    } else {
      byBroadcast.set(key, {
        key,
        title: row.title,
        body: row.body,
        createdAt: row.created_at,
        audience: row.profiles?.[0]?.role || 'contributor',
        recipientCount: 1,
        readCount: row.is_read ? 1 : 0,
      });
    }
  });

  return Array.from(byBroadcast.values()).slice(0, 30);
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const { audience } = await searchParams;

  return (
    <div>
      <AddNewPanel
        title="Notifications"
        description="Compose a message and send it as an in-app notification to all contributors or all volunteers."
        label="Send new"
      >
        <NotificationsForm />
      </AddNewPanel>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Sent History</h2>
        <PillTabs
          items={[
            { key: 'all', label: 'All', href: '/notifications', active: !audience },
            {
              key: 'contributor',
              label: 'Contributors',
              href: '/notifications?audience=contributor',
              active: audience === 'contributor',
            },
            {
              key: 'volunteer',
              label: 'Volunteers',
              href: '/notifications?audience=volunteer',
              active: audience === 'volunteer',
            },
          ]}
        />
      </div>

      <Suspense fallback={<SkeletonTable rows={5} cols={5} />}>
        <SentHistoryTable audience={audience} />
      </Suspense>
    </div>
  );
}

async function SentHistoryTable({ audience }: { audience?: string }) {
  const allHistory = await getSentHistory();
  const history = audience ? allHistory.filter((b) => b.audience === audience) : allHistory;

  return (
    <div className={tableWrapClass}>
      {history.length === 0 ? (
        <EmptyState icon={History} title="No announcements sent yet" description="Broadcasts you send above will show up here." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Title</th>
              <th className={tableCellClass}>Message</th>
              <th className={tableCellClass}>Sent</th>
              <th className={tableCellClass}>Recipients</th>
              <th className={tableCellClass}>Read</th>
            </tr>
          </thead>
          <tbody>
            {history.map((b, i) => (
              <tr key={b.key} className={tableRowClass} style={staggerDelay(i)}>
                <td className={`${tableCellClass} font-semibold text-kiranam-ink`}>{b.title}</td>
                <td className={`${tableCellClass} max-w-xs truncate text-kiranam-muted`}>{b.body}</td>
                <td className={`${tableCellClass} text-kiranam-muted`}>{new Date(b.createdAt).toLocaleString('en-IN')}</td>
                <td className={`${tableCellNumClass} text-kiranam-muted`}>{b.recipientCount}</td>
                <td className={`${tableCellNumClass} text-kiranam-muted`}>
                  {b.readCount} / {b.recipientCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
