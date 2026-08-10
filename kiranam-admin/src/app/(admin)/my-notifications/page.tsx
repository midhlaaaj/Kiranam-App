import { Bell } from 'lucide-react';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/EmptyState';
import { buttonSecondary, cardClass } from '@/lib/ui';
import { markNotificationRead, markAllNotificationsRead } from './actions';

// Admins work from this website, not the mobile app — so system-generated
// notifications directed at an admin (new volunteer applications, a
// campaign hitting its goal, a large contribution) land here instead of as
// a phone push. See notify() in the database: it skips the push fan-out
// entirely for role = 'admin' recipients.
export default async function MyNotificationsPage() {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, category, deep_link, is_read, created_at')
    .eq('profile_id', admin.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const hasUnread = (notifications || []).some((n) => !n.is_read);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-kiranam-ink">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className={buttonSecondary}>
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <div className={`${cardClass} divide-y divide-kiranam-border`}>
        {!notifications || notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" description="Things that need your attention will show up here." />
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.is_read ? '' : 'bg-kiranam-surface-alt/50'}`}>
              {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-kiranam-primary" aria-hidden="true" />}
              <div className={`min-w-0 flex-1 ${n.is_read ? 'pl-5' : ''}`}>
                <p className="text-sm font-semibold text-kiranam-ink">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-kiranam-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-kiranam-muted">{new Date(n.created_at).toLocaleString('en-IN')}</p>
              </div>
              {!n.is_read && (
                <form action={markNotificationRead.bind(null, n.id)}>
                  <button type="submit" className="shrink-0 text-xs font-medium text-kiranam-primary hover:underline">
                    Mark read
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
