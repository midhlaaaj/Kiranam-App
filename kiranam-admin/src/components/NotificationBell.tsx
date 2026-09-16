import Link from 'next/link';
import { Bell } from 'lucide-react';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

// Self-fetching so it can drop into any page header (PageHeading,
// AddNewPanel) without threading unreadCount through every page's own data
// fetch — same unread query AdminShell used to run for the old app-wide bar.
export async function NotificationBell() {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', admin.id)
    .eq('is_read', false);
  const unreadCount = count ?? 0;

  return (
    <Link
      href="/my-notifications"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-kiranam-primary text-white shadow-elevation-sm transition hover:bg-kiranam-primary-strong"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-kiranam-surface bg-white px-1 text-[9px] font-bold text-kiranam-primary">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
