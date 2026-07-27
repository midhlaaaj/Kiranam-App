import Link from 'next/link';
import { ArrowLeft, Trash2, Users as UsersIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { approveApplication, assignContributor, rejectApplication, unassignContributor } from '../actions';
import { deriveContributorStatus } from '@/lib/volunteerStats';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { ContributorCombobox } from '@/components/ContributorCombobox';
import { badgeClass, buttonPrimary, buttonSecondary, cardClass, formatMoney } from '@/lib/ui';

export default async function VolunteerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!profile) notFound();

  const { data: application } = await supabase
    .from('volunteer_applications')
    .select('*')
    .eq('profile_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isPending = profile.role !== 'volunteer' && application?.status === 'pending';

  if (isPending) {
    return (
      <div>
        <Link href="/volunteers?tab=pending" className="inline-flex items-center gap-1.5 text-sm font-medium text-kiranam-muted transition hover:text-kiranam-ink hover:underline">
          <ArrowLeft size={15} /> Back to Volunteers
        </Link>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance text-kiranam-ink">{profile.full_name || 'Unnamed'}</h1>
        <p className="text-sm text-kiranam-muted">{profile.phone}</p>

        <div className={`mt-6 ${cardClass} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-kiranam-muted">Motivation</p>
          <p className="mt-2 text-sm text-kiranam-ink/80">{application?.motivation}</p>

          <div className="mt-5 flex gap-2">
            <ConfirmSubmitButton
              action={approveApplication.bind(null, application!.id, profile.id)}
              label="Approve"
              title="Approve this application?"
              description={`${profile.full_name || 'This applicant'} will be promoted to a volunteer and can start being assigned contributors.`}
              confirmLabel="Approve"
              successMessage="Application approved."
              pendingMessage="Approving…"
              className={buttonPrimary}
            />
            <ConfirmSubmitButton
              action={rejectApplication.bind(null, application!.id, profile.id)}
              label="Reject"
              title="Reject this application?"
              description={`${profile.full_name || 'This applicant'} will not be made a volunteer. They can reapply later.`}
              confirmLabel="Reject"
              successMessage="Application rejected."
              pendingMessage="Rejecting…"
              className={buttonSecondary}
            />
          </div>
        </div>
      </div>
    );
  }

  // Approved volunteer view (also covers a rejected/no-application volunteer profile).
  const [{ data: referral }, { data: assignments }, { data: allContributors }] = await Promise.all([
    supabase.from('referrals').select('referral_code').eq('volunteer_id', id).maybeSingle(),
    supabase.from('contributor_assignments').select('contributor_id').eq('volunteer_id', id),
    supabase.from('profiles').select('id, full_name, phone').eq('role', 'contributor').order('full_name'),
  ]);

  const assignedIds = new Set((assignments || []).map((a) => a.contributor_id));
  const assignedContributors = (allContributors || []).filter((c) => assignedIds.has(c.id));
  const unassignedContributors = (allContributors || []).filter((c) => !assignedIds.has(c.id));

  const { data: commitments } = assignedContributors.length
    ? await supabase
        .from('commitments')
        .select('contributor_id, monthly_amount, autopay_enabled, next_due_date')
        .in('contributor_id', assignedContributors.map((c) => c.id))
    : { data: [] };
  const commitmentByContributor = new Map((commitments || []).map((c) => [c.contributor_id, c]));

  const statusCounts = { active: 0, due: 0, overdue: 0, inactive: 0 };
  let portfolioValue = 0;
  assignedContributors.forEach((c) => {
    const commitment = commitmentByContributor.get(c.id);
    statusCounts[deriveContributorStatus(commitment)] += 1;
    if (commitment) portfolioValue += Number(commitment.monthly_amount);
  });

  return (
    <div>
      <Link href="/volunteers?tab=approved" className="inline-flex items-center gap-1.5 text-sm font-medium text-kiranam-muted transition hover:text-kiranam-ink hover:underline">
        <ArrowLeft size={15} /> Back to Volunteers
      </Link>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance text-kiranam-ink">{profile.full_name || 'Unnamed'}</h1>
      <p className="text-sm text-kiranam-muted">
        {profile.phone} · Referral code:{' '}
        <span className="font-mono text-kiranam-ink">{referral?.referral_code || '—'}</span>
      </p>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-kiranam-ink">Performance</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard index={0} label="Assigned Contributors" value={assignedContributors.length.toString()} />
        <StatCard index={1} label="Monthly Portfolio Value" value={formatMoney(portfolioValue)} />
      </div>

      <div className={`mt-3 ${cardClass} flex flex-wrap items-center gap-x-6 gap-y-2 p-4`}>
        {(
          [
            { label: 'Active', value: statusCounts.active, tone: 'success' },
            { label: 'Due', value: statusCounts.due, tone: 'warning' },
            { label: 'Overdue', value: statusCounts.overdue, tone: 'danger' },
            { label: 'Inactive', value: statusCounts.inactive, tone: 'neutral' },
          ] as const
        ).map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={badgeClass(s.tone)}>{s.label}</span>
            <span className="text-sm font-semibold tabular-nums text-kiranam-ink">{s.value}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-kiranam-ink">Assigned Contributors</h2>
      <div className={`mt-3 ${cardClass} divide-y divide-kiranam-border`}>
        {assignedContributors.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No contributors assigned yet" />
        ) : (
          assignedContributors.map((c) => {
            const commitment = commitmentByContributor.get(c.id);
            const status = deriveContributorStatus(commitment);
            return (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-semibold text-kiranam-ink">{c.full_name || 'Unnamed'}</p>
                  <p className="text-sm text-kiranam-muted">{c.phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={badgeClass(status === 'active' ? 'success' : status === 'due' ? 'warning' : status === 'overdue' ? 'danger' : 'neutral')}>
                    {status}
                  </span>
                  <ConfirmSubmitButton
                    action={unassignContributor.bind(null, id, c.id)}
                    label={<Trash2 size={16} strokeWidth={2} />}
                    title="Unassign this contributor?"
                    description={`${c.full_name || 'This contributor'} will no longer be assigned to this volunteer.`}
                    confirmLabel="Unassign"
                    successMessage="Contributor unassigned."
                    pendingMessage="Unassigning…"
                    className="cursor-pointer rounded-lg p-2 text-kiranam-danger transition hover:bg-kiranam-danger-soft"
                    aria-label="Unassign contributor"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-kiranam-ink">Assign a Contributor</h2>
      <form action={assignContributor.bind(null, id)} className="mt-3 flex flex-wrap items-start gap-2">
        <ContributorCombobox contributors={unassignedContributors} name="contributorId" />
        <button type="submit" className={buttonPrimary}>
          Assign
        </button>
      </form>
    </div>
  );
}
