import { Suspense } from 'react';
import { MailPlus, ShieldCheck } from 'lucide-react';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { revokeAdmin } from './actions';
import { revokeInvite } from '../actions';
import { InviteAdminForm } from '../InviteAdminForm';
import { ResendInviteButton } from './ResendInviteButton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SkeletonTable } from '@/components/Skeleton';
import { formatDate, formatDateTimeFull, formatRelative } from '@/lib/format';
import {
  badgeClass,
  staggerDelay,
  tableCellClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

interface AdminRow {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const rowActionDangerClass =
  'inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-sm font-semibold text-kiranam-danger transition hover:bg-kiranam-danger-soft';

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-kiranam-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-kiranam-muted">{description}</p>}
    </div>
  );
}

// Heading + tabs come from settings/layout.tsx.
export default function TeamPage() {
  return (
    <div className="grid gap-10">
      <section>
        <SectionHeading title="Invite an admin" />
        <InviteAdminForm />
      </section>

      <section>
        <SectionHeading title="Pending invites" description="Invites that haven’t been used to create an account yet." />
        <Suspense fallback={<SkeletonTable rows={2} cols={4} />}>
          <PendingInvites />
        </Suspense>
      </section>

      <section>
        <SectionHeading title="Admins" description="Everyone who can sign in to this panel." />
        <Suspense fallback={<SkeletonTable rows={4} cols={4} />}>
          <AdminsTable />
        </Suspense>
      </section>
    </div>
  );
}

async function PendingInvites() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('admin_invites')
    .select('id, email, created_at, expires_at')
    .is('used_at', null)
    .order('created_at', { ascending: false });
  const invites = data || [];
  const now = new Date();

  return (
    <div className={tableWrapClass}>
      {invites.length === 0 ? (
        <EmptyState icon={MailPlus} title="No pending invites" description="Invites you send will wait here until they’re used." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Email</th>
              <th className={tableCellClass}>Status</th>
              <th className={tableCellClass}>Sent</th>
              <th className={tableCellClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite, i) => {
              const expired = new Date(invite.expires_at) <= now;
              return (
                <tr key={invite.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={`${tableCellClass} font-medium text-kiranam-ink`}>{invite.email}</td>
                  <td className={tableCellClass}>
                    <span className={badgeClass(expired ? 'danger' : 'warning')}>
                      {expired ? 'Expired' : `Expires ${formatDate(invite.expires_at)}`}
                    </span>
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    <time dateTime={invite.created_at} title={formatDateTimeFull(invite.created_at)}>
                      {formatDate(invite.created_at)}
                    </time>
                  </td>
                  <td className={`${tableCellClass} text-right`}>
                    <div className="flex justify-end gap-1">
                      <ResendInviteButton inviteId={invite.id} email={invite.email} />
                      <ConfirmSubmitButton
                        action={revokeInvite.bind(null, invite.id)}
                        label={expired ? 'Delete' : 'Revoke'}
                        title={expired ? 'Delete this invite?' : 'Revoke this invite?'}
                        description={`${invite.email} won’t be able to create an admin account with this invite.`}
                        confirmLabel={expired ? 'Delete invite' : 'Revoke invite'}
                        successMessage={expired ? 'Invite deleted.' : 'Invite revoked.'}
                        pendingMessage="Removing invite…"
                        destructive
                        className={rowActionDangerClass}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

async function AdminsTable() {
  const currentAdmin = await verifyAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_directory');
  const admins = (data || []) as AdminRow[];

  return (
    <div className={tableWrapClass}>
      {admins.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No admins found" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Name</th>
              <th className={tableCellClass}>Email</th>
              <th className={tableCellClass}>Admin since</th>
              <th className={tableCellClass}>Last sign-in</th>
              <th className={tableCellClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a, i) => {
              const isSelf = a.id === currentAdmin.id;
              return (
                <tr key={a.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={`${tableCellClass} font-semibold text-kiranam-ink`}>
                    <span className="inline-flex items-center gap-2">
                      {a.full_name || 'Unnamed'}
                      {isSelf && <span className={badgeClass('neutral')}>You</span>}
                    </span>
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>{a.email}</td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>{formatDate(a.created_at)}</td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {a.last_sign_in_at ? (
                      <time dateTime={a.last_sign_in_at} title={formatDateTimeFull(a.last_sign_in_at)}>
                        {formatRelative(a.last_sign_in_at)}
                      </time>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td className={`${tableCellClass} text-right`}>
                    {isSelf ? (
                      <span className="text-xs text-kiranam-muted" title="Ask another admin to remove your access.">
                        Can’t remove yourself
                      </span>
                    ) : (
                      <ConfirmSubmitButton
                        action={revokeAdmin.bind(null, a.id)}
                        label="Remove access"
                        title={`Remove ${a.full_name || a.email}’s admin access?`}
                        description="They’ll be signed out of the admin panel immediately and become a regular contributor. You can invite them again later."
                        confirmLabel="Remove access"
                        successMessage="Admin access removed."
                        pendingMessage="Removing access…"
                        destructive
                        className={rowActionDangerClass}
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
  );
}
