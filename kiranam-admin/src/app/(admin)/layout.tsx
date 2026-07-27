import { verifyAdmin } from '@/lib/dal';
import { logout } from '@/lib/actions/auth';
import { AdminShell, LogoutIcon } from '@/components/AdminShell';

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
    <AdminShell initials={initials} email={admin.email || ''} logoutButton={logoutButton}>
      {children}
    </AdminShell>
  );
}
