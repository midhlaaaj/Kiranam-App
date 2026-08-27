import { MailPlus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { revokeInvite } from './actions';
import { InviteAdminForm } from './InviteAdminForm';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { AddNewPanel } from '@/components/AddNewPanel';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SettingsTabs } from './SettingsTabs';
import {
  badgeClass,
  staggerDelay,
  tableCellClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

// 'Used' beats 'Expired' beats 'Pending' — an already-claimed invite is
// never shown as expired even if its expires_at has since passed, since
// used_at being set means it was successfully claimed before then.
function inviteStatus(invite: { used_at: string | null; expires_at: string }): 'used' | 'expired' | 'pending' {
  if (invite.used_at) return 'used';
  if (new Date(invite.expires_at) <= new Date()) return 'expired';
  return 'pending';
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: invites } = await supabase
    .from('admin_invites')
    .select('id, email, used_at, created_at, expires_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeading title="Settings" />
      <div className="mt-4">
        <SettingsTabs active="general" />
      </div>

      <div className="mt-6">
        <AddNewPanel
          title="Admin Invites"
          description={
            <>
              Invite someone to become an admin. They can only create an account at{' '}
              <span className="font-mono text-kiranam-ink">/signup</span> using this exact email, within 7 days.
              Submitting the same email again resends it and resets the 7-day window.
            </>
          }
          label="Invite Admin"
        >
          <InviteAdminForm />
        </AddNewPanel>
      </div>

      <div className={`mt-6 ${tableWrapClass}`}>
        {(invites || []).length === 0 ? (
          <EmptyState icon={MailPlus} title="No invites yet" description="Invite an admin above to see it listed here." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableCellClass}>Email</th>
                <th className={tableCellClass}>Status</th>
                <th className={tableCellClass}>Invited</th>
                <th className={tableCellClass}>Expires</th>
                <th className={tableCellClass}></th>
              </tr>
            </thead>
            <tbody>
              {(invites || []).map((invite, i) => {
                const status = inviteStatus(invite);
                return (
                  <tr key={invite.id} className={tableRowClass} style={staggerDelay(i)}>
                    <td className={`${tableCellClass} font-medium text-kiranam-ink`}>{invite.email}</td>
                    <td className={tableCellClass}>
                      <span
                        className={badgeClass(
                          status === 'used' ? 'neutral' : status === 'expired' ? 'danger' : 'warning'
                        )}
                      >
                        {status === 'used' ? 'Used' : status === 'expired' ? 'Expired' : 'Pending'}
                      </span>
                    </td>
                    <td className={`${tableCellClass} text-kiranam-muted`}>
                      {new Date(invite.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className={`${tableCellClass} text-kiranam-muted`}>
                      {invite.used_at ? '—' : new Date(invite.expires_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      {!invite.used_at && (
                        <ConfirmSubmitButton
                          action={revokeInvite.bind(null, invite.id)}
                          label={<Trash2 size={16} strokeWidth={2} />}
                          title="Revoke this invite?"
                          description={`${invite.email} will no longer be able to create an admin account with this invite.`}
                          confirmLabel="Revoke"
                          successMessage="Invite revoked."
                          pendingMessage="Revoking invite…"
                          className="cursor-pointer rounded-lg p-2 text-kiranam-danger transition hover:bg-kiranam-danger-soft"
                          aria-label="Revoke invite"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
