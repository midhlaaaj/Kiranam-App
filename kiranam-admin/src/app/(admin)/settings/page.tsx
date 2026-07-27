import { MailPlus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createInvite, revokeInvite } from './actions';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { AddNewPanel } from '@/components/AddNewPanel';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SettingsTabs } from './SettingsTabs';
import {
  badgeClass,
  buttonPrimary,
  cardClass,
  inputClass,
  staggerDelay,
  tableCellClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: invites } = await supabase
    .from('admin_invites')
    .select('id, email, used_at, created_at')
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
              <span className="font-mono text-kiranam-ink">/signup</span> using this exact email.
            </>
          }
          label="Invite Admin"
        >
          <form action={createInvite} className={`flex max-w-md gap-2 ${cardClass} p-4`}>
            <input name="email" type="email" placeholder="new-admin@email.com" required className={inputClass} />
            <button type="submit" className={buttonPrimary}>
              Invite
            </button>
          </form>
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
                <th className={tableCellClass}></th>
              </tr>
            </thead>
            <tbody>
              {(invites || []).map((invite, i) => (
                <tr key={invite.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={`${tableCellClass} font-medium text-kiranam-ink`}>{invite.email}</td>
                  <td className={tableCellClass}>
                    <span className={badgeClass(invite.used_at ? 'neutral' : 'warning')}>
                      {invite.used_at ? 'Used' : 'Pending'}
                    </span>
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {new Date(invite.created_at).toLocaleDateString('en-IN')}
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
