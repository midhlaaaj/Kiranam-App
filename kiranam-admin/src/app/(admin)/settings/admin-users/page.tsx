import { ShieldCheck, ShieldOff } from 'lucide-react';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { revokeAdmin } from './actions';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SettingsTabs } from '../SettingsTabs';
import { staggerDelay, tableCellClass, tableHeadRowClass, tableRowClass, tableWrapClass } from '@/lib/ui';

interface AdminRow {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default async function AdminUsersPage() {
  const currentAdmin = await verifyAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_directory');
  const admins = (data || []) as AdminRow[];

  return (
    <div>
      <PageHeading title="Settings" />
      <div className="mt-4">
        <SettingsTabs active="admin-users" />
      </div>

      <div className={`mt-6 ${tableWrapClass}`}>
        {admins.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No admins found" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableCellClass}>Name</th>
                <th className={tableCellClass}>Email</th>
                <th className={tableCellClass}>Granted</th>
                <th className={tableCellClass}>Last Sign In</th>
                <th className={tableCellClass}></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a, i) => (
                <tr key={a.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={`${tableCellClass} font-semibold text-kiranam-ink`}>{a.full_name || 'Unnamed'}</td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>{a.email}</td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {new Date(a.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString('en-IN') : 'Never'}
                  </td>
                  <td className={`${tableCellClass} text-right`}>
                    {a.id !== currentAdmin.id && (
                      <ConfirmSubmitButton
                        action={revokeAdmin.bind(null, a.id)}
                        label={<ShieldOff size={16} strokeWidth={2} />}
                        title="Revoke admin access?"
                        description={`${a.full_name || a.email || 'This admin'} will immediately lose admin access and be demoted to a contributor.`}
                        confirmLabel="Revoke access"
                        successMessage="Admin access revoked."
                        pendingMessage="Revoking access…"
                        className="cursor-pointer rounded-lg p-2 text-kiranam-danger transition hover:bg-kiranam-danger-soft"
                        aria-label="Revoke admin access"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
