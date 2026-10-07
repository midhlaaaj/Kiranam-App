import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/actions/auth';
import { Suspense } from 'react';
import { AdminShell, LogoutIcon } from '@/components/AdminShell';
import { NotificationBell } from '@/components/NotificationBell';

// Pending volunteer applications, shown beside Volunteers in the sidebar.
async function PendingApplicationsBadge() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('volunteer_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (!count) return null;
  return (
    <span
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-kiranam-primary px-1.5 text-xs font-semibold tabular-nums text-white"
      aria-label={`${count} pending`}
    >
      {count}
    </span>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdmin();
  const initials = (admin.full_name || admin.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const logoutButton = (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-kiranam-muted transition-colors duration-200 ease-out hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
      >
        <LogoutIcon />
        Log out
      </button>
    </form>
  );

  return (
    <AdminShell
      initials={initials}
      email={admin.email || ''}
      logoutButton={logoutButton}
      // Both render at once; only the numbers stream in afterwards.
      navBadges={{
        '/volunteers': (
          <Suspense fallback={null}>
            <PendingApplicationsBadge />
          </Suspense>
        ),
      }}
      bell={<NotificationBell />}
    >
      {children}
    </AdminShell>
  );
}
