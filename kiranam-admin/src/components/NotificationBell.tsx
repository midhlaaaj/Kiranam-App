import { Suspense } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

// The bell itself renders instantly (it's just a link); only the small unread
// count streams in behind its own Suspense boundary, so nothing waits on the
// database for the header to appear.
async function UnreadBadge() {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', admin.id)
    .eq('is_read', false);
  const unreadCount = count ?? 0;
  if (unreadCount === 0) return null;
  return (
    <span
      className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-kiranam-surface bg-kiranam-ink px-1 text-[11px] font-bold tabular-nums text-white"
      aria-label={`${unreadCount} unread`}
    >
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}

export function NotificationBell() {
  return (
    <Link
      href="/my-notifications"
      aria-label="Notifications"
      className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-kiranam-primary text-white shadow-elevation-sm transition hover:bg-kiranam-primary-strong"
    >
      <Bell size={18} aria-hidden />
      <Suspense fallback={null}>
        <UnreadBadge />
      </Suspense>
    </Link>
  );
}
