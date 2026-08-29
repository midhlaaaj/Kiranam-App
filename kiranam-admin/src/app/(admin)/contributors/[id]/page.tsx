import Link from 'next/link';
import { ArrowLeft, Trash2, Wallet } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { PersonCombobox } from '@/components/PersonCombobox';
import { OfflinePaymentForm } from '../OfflinePaymentForm';
import { assignVolunteer, unassignVolunteer } from '../actions';
import {
  badgeClass,
  buttonPrimary,
  cardClass,
  formatMoney,
  staggerDelay,
  tableCellClass,
  tableCellNumClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

export default async function ContributorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!profile) notFound();

  const [{ data: commitment }, { data: contributions }, { data: assignment }, { data: activeCampaigns }, { data: allVolunteers }] = await Promise.all([
    supabase.from('commitments').select('*').eq('contributor_id', id).maybeSingle(),
    supabase
      .from('contributions')
      .select('*')
      .eq('contributor_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contributor_assignments')
      .select('volunteer_id')
      .eq('contributor_id', id)
      .maybeSingle(),
    supabase.from('campaigns').select('id, title').eq('status', 'active').order('title', { ascending: true }),
    supabase.from('profiles').select('id, full_name, phone').eq('role', 'volunteer').order('full_name'),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = (contributions || []).some(
    (c) => c.status === 'success' && new Date(c.created_at) >= monthStart
  );

  let volunteer: { id: string; full_name: string } | null = null;
  if (assignment?.volunteer_id) {
    const { data: vol } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', assignment.volunteer_id)
      .maybeSingle();
    volunteer = vol;
  }

  const collectorIds = [...new Set((contributions || []).map((c) => c.collected_by).filter(Boolean))];
  const { data: collectors } = collectorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', collectorIds)
    : { data: [] };
  const collectorNameById = new Map((collectors || []).map((c) => [c.id, c.full_name || 'Unnamed']));

  return (
    <div>
      <Link href="/contributors" className="inline-flex items-center gap-1.5 text-sm font-medium text-kiranam-muted transition hover:text-kiranam-ink hover:underline">
        <ArrowLeft size={15} /> Back to Contributors
      </Link>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance text-kiranam-ink">{profile.full_name || 'Unnamed'}</h1>
      <p className="text-sm text-kiranam-muted">
        {profile.phone ? `${profile.phone} · ` : ''}
        {profile.email || 'No email'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard index={0} label="Monthly Amount" value={commitment ? formatMoney(Number(commitment.monthly_amount)) : 'Not set'} />
        <StatCard index={1} label="Autopay" value={commitment ? (commitment.autopay_enabled ? 'Enabled' : 'Disabled') : '—'} />
        <StatCard
          index={2}
          label="Next Due"
          value={commitment?.next_due_date ? new Date(commitment.next_due_date).toLocaleDateString('en-IN') : '—'}
        />
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight text-kiranam-ink">Volunteer</h2>
      <div className={`mt-3 ${cardClass} flex flex-wrap items-center justify-between gap-3 p-4`}>
        {volunteer ? (
          <>
            <Link href={`/volunteers/${volunteer.id}`} className="font-semibold text-kiranam-ink hover:underline">
              {volunteer.full_name || 'Unnamed'}
            </Link>
            <ConfirmSubmitButton
              action={unassignVolunteer.bind(null, id, volunteer.id)}
              label={<Trash2 size={16} strokeWidth={2} />}
              title="Unassign this volunteer?"
              description={`${volunteer.full_name || 'This volunteer'} will no longer be assigned to ${profile.full_name || 'this contributor'}.`}
              confirmLabel="Unassign"
              successMessage="Volunteer unassigned."
              pendingMessage="Unassigning…"
              className="flex h-9 w-9 items-center justify-center cursor-pointer rounded-lg text-kiranam-danger transition hover:bg-kiranam-danger-soft"
              aria-label="Unassign volunteer"
            />
          </>
        ) : (
          <p className="text-sm text-kiranam-muted">No volunteer assigned yet.</p>
        )}
      </div>
      <form action={assignVolunteer.bind(null, id)} className="mt-3 flex flex-wrap items-start gap-2">
        <PersonCombobox
          people={(allVolunteers || []).filter((v) => v.id !== volunteer?.id)}
          name="volunteerId"
          placeholder="Search volunteers by name or phone…"
          emptyLabel="No volunteers match."
        />
        <button type="submit" className={buttonPrimary}>
          {volunteer ? 'Reassign' : 'Assign'}
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Contribution History</h2>
      </div>
      <div className="mt-3">
        <OfflinePaymentForm contributorId={id} campaigns={activeCampaigns || []} paidThisMonth={paidThisMonth} contributorName={profile.full_name} />
      </div>
      <div className={`mt-4 ${tableWrapClass}`}>
        {(!contributions || contributions.length === 0) ? (
          <EmptyState icon={Wallet} title="No contributions yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableCellClass}>Date</th>
                <th className={tableCellClass}>Label</th>
                <th className={tableCellClass}>Amount</th>
                <th className={tableCellClass}>Status</th>
                <th className={tableCellClass}>Collected By</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c, i) => (
                <tr key={c.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {new Date(c.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className={`${tableCellClass} text-kiranam-ink`}>
                    {c.label}
                    {c.is_offline && <span className={`ml-2 ${badgeClass('neutral')}`}>Offline</span>}
                  </td>
                  <td className={`${tableCellNumClass} text-kiranam-muted`}>{formatMoney(Number(c.amount))}</td>
                  <td className={tableCellClass}>
                    <span className={badgeClass(c.status === 'success' ? 'success' : 'danger')}>{c.status}</span>
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {c.collected_by ? collectorNameById.get(c.collected_by) || '—' : '—'}
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
