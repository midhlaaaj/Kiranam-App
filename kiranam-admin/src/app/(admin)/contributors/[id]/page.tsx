import Link from 'next/link';
import { Trash2, Wallet } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditLayout } from '@/components/EditLayout';
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

  // One round of queries: everything below is independent of the profile.
  const [
    { data: profile },
    { data: commitment },
    { data: contributions },
    { data: assignment },
    { data: activeCampaigns },
    { data: allVolunteers },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('commitments').select('*').eq('contributor_id', id).maybeSingle(),
    supabase
      .from('contributions')
      // Collector names come embedded, instead of a follow-up lookup.
      .select('*, collector:profiles!contributions_collected_by_fkey(full_name)')
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
  if (!profile) notFound();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = (contributions || []).some(
    (c) => c.status === 'success' && new Date(c.created_at) >= monthStart
  );

  // The assigned coordinator is always in the coordinator list loaded above.
  const assigned = assignment?.volunteer_id ? (allVolunteers || []).find((v) => v.id === assignment.volunteer_id) : undefined;
  const volunteer: { id: string; full_name: string } | null = assigned
    ? { id: assigned.id, full_name: assigned.full_name || '' }
    : null;

  const collectorNameById = new Map(
    (contributions || [])
      .filter((c) => c.collected_by)
      .map((c) => {
        const collector = c.collector as { full_name: string | null } | { full_name: string | null }[] | null;
        const name = Array.isArray(collector) ? collector[0]?.full_name : collector?.full_name;
        return [c.collected_by as string, name || 'Unnamed'];
      })
  );

  const dueDate = commitment?.next_due_date ? new Date(commitment.next_due_date).toLocaleDateString('en-IN') : '—';
  const meta = [profile.kk_number, profile.phone, profile.email].filter(Boolean).join(' · ');

  return (
    <EditLayout
      backHref="/contributors"
      backLabel="All contributors"
      title={profile.full_name || 'Unnamed'}
      subtitle={meta || undefined}
      main={
        <div>
          <OfflinePaymentForm contributorId={id} campaigns={activeCampaigns || []} paidThisMonth={paidThisMonth} contributorName={profile.full_name} />
          <div className={`mt-4 ${tableWrapClass}`}>
            {!contributions || contributions.length === 0 ? (
              <EmptyState icon={Wallet} title="No contributions yet" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHeadRowClass}>
                    <th className={tableCellClass}>Date</th>
                    <th className={tableCellClass}>Details</th>
                    <th className={tableCellClass}>Amount</th>
                    <th className={tableCellClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c, i) => (
                    <tr key={c.id} className={tableRowClass} style={staggerDelay(i)}>
                      <td className={`${tableCellClass} whitespace-nowrap text-kiranam-muted`}>
                        {new Date(c.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className={`${tableCellClass} text-kiranam-ink`}>
                        {c.label}
                        {c.is_offline && (
                          <span className="block text-xs text-kiranam-muted">
                            Offline{c.collected_by ? ` · collected by ${collectorNameById.get(c.collected_by) || '—'}` : ''}
                          </span>
                        )}
                      </td>
                      <td className={`${tableCellNumClass} text-kiranam-ink`}>{formatMoney(Number(c.amount))}</td>
                      <td className={tableCellClass}>
                        <span className={badgeClass(c.status === 'success' ? 'success' : 'danger')}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      }
      aside={
        <>
          <section className={`${cardClass} p-4`}>
            <h2 className="text-sm font-semibold text-kiranam-ink">Commitment</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-kiranam-muted">Monthly</dt>
                <dd className="font-medium text-kiranam-ink">{commitment ? formatMoney(Number(commitment.monthly_amount)) : 'Not set'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-kiranam-muted">Autopay</dt>
                <dd className="font-medium text-kiranam-ink">{commitment ? (commitment.autopay_enabled ? 'On' : 'Off') : '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-kiranam-muted">Next due</dt>
                <dd className="font-medium text-kiranam-ink">{dueDate}</dd>
              </div>
            </dl>
          </section>

          <section className={`${cardClass} p-4`}>
            <h2 className="text-sm font-semibold text-kiranam-ink">Coordinator</h2>
            {volunteer ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <Link href={`/volunteers/${volunteer.id}`} className="min-w-0 truncate text-sm font-medium text-kiranam-ink hover:underline">
                  {volunteer.full_name || 'Unnamed'}
                </Link>
                <ConfirmSubmitButton
                  action={unassignVolunteer.bind(null, id, volunteer.id)}
                  label={<Trash2 size={16} strokeWidth={2} />}
                  title="Unassign this coordinator?"
                  description={`${volunteer.full_name || 'This coordinator'} will no longer be assigned to ${profile.full_name || 'this contributor'}.`}
                  confirmLabel="Unassign"
                  destructive
                  successMessage="Coordinator unassigned."
                  pendingMessage="Unassigning…"
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-kiranam-danger transition hover:bg-kiranam-danger-soft"
                  aria-label="Unassign coordinator"
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-kiranam-muted">Not assigned yet.</p>
            )}
            <form action={assignVolunteer.bind(null, id)} className="mt-3 grid gap-2">
              <PersonCombobox
                people={(allVolunteers || []).filter((v) => v.id !== volunteer?.id)}
                name="volunteerId"
                placeholder={volunteer ? 'Change coordinator…' : 'Search coordinators…'}
                emptyLabel="No coordinators match."
                className="max-w-none"
              />
              <button type="submit" className={buttonPrimary}>
                {volunteer ? 'Reassign' : 'Assign'}
              </button>
            </form>
          </section>
        </>
      }
    />
  );
}
