import { Suspense } from 'react';
import { UserRoundCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { PendingApplicantRow } from './PendingApplicantRow';
import { VolunteersRegisterPanel } from './VolunteersRegisterPanel';
import { VolunteersTableClient } from './VolunteersTableClient';
import { PillTabs } from '@/components/PillTabs';
import { FilterResults, FilterRoot, FilterSearch } from '@/components/filters/FilterBar';
import { tableCellClass, tableHeadRowClass, tableWrapClass } from '@/lib/ui';
import { searchTerm } from '@/lib/search';
import { cn } from '@/lib/utils';

async function getApprovedVolunteers(query: string) {
  const supabase = await createClient();

  let request = supabase
    .from('profiles')
    .select('id, full_name, phone, created_at')
    .eq('role', 'volunteer')
    .order('created_at', { ascending: false });

  const term = searchTerm(query);
  if (term) {
    request = request.or(`full_name.ilike.*${term}*,phone.ilike.*${term.replace(/\D/g, '') || term}*`);
  }

  const { data: volunteers } = await request;

  const ids = (volunteers || []).map((v) => v.id);

  const [{ data: referrals }, { data: assignments }] = await Promise.all([
    ids.length
      ? supabase.from('referrals').select('volunteer_id, referral_code').in('volunteer_id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from('contributor_assignments').select('volunteer_id').in('volunteer_id', ids)
      : Promise.resolve({ data: [] }),
  ]);

  const referralByVolunteer = new Map((referrals || []).map((r) => [r.volunteer_id, r.referral_code]));
  const assignmentCounts = new Map<string, number>();
  (assignments || []).forEach((a) => {
    assignmentCounts.set(a.volunteer_id, (assignmentCounts.get(a.volunteer_id) || 0) + 1);
  });

  return (volunteers || []).map((v) => ({
    ...v,
    referralCode: referralByVolunteer.get(v.id) ?? '—',
    assignedCount: assignmentCounts.get(v.id) ?? 0,
  }));
}

async function getPendingApplicants(query: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('volunteer_applications')
    .select('id, created_at, motivation, profiles!volunteer_applications_profile_id_fkey(id, full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const rows = (data || []) as unknown as {
    id: string;
    created_at: string;
    motivation: string | null;
    profiles: { id: string; full_name: string; phone: string | null } | null;
  }[];

  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (r) => r.profiles?.full_name?.toLowerCase().includes(q) || r.profiles?.phone?.toLowerCase().includes(q)
  );
}

async function VolunteerTabs({ render }: { render: (pendingCount: number) => React.ReactNode }) {
  return render(await getPendingCount());
}

async function getPendingCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('volunteer_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  return count ?? 0;
}

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const activeTab = tab === 'pending' ? 'pending' : 'approved';

  // The title, search and tabs render straight away; only the pending count
  // in the dropdown waits for the database (it streams in behind this).
  const tabs = (pendingCount?: number) => (
    <PillTabs
      label="Show"
      items={[
        {
          key: 'approved',
          label: 'Approved',
          href: `/volunteers?tab=approved${q ? `&q=${encodeURIComponent(q)}` : ''}`,
          active: activeTab === 'approved',
        },
        {
          key: 'pending',
          label: 'Pending applications',
          href: `/volunteers?tab=pending${q ? `&q=${encodeURIComponent(q)}` : ''}`,
          active: activeTab === 'pending',
          count: pendingCount,
        },
      ]}
    />
  );
  const filterPills = (
    <Suspense fallback={tabs()}>
      <VolunteerTabs render={tabs} />
    </Suspense>
  );

  return (
    <FilterRoot>
      <VolunteersRegisterPanel
        filters={filterPills}
        search={<FilterSearch placeholder="Search by name or phone" label="Search volunteers" />}
      />

      <FilterResults>
        <Suspense key={`${activeTab}:${q ?? ''}`} fallback={<SkeletonTable rows={7} cols={4} />}>
          <VolunteersTable activeTab={activeTab} q={q} />
        </Suspense>
      </FilterResults>
    </FilterRoot>
  );
}

async function VolunteersTable({ activeTab, q }: { activeTab: 'approved' | 'pending'; q?: string }) {
  const [volunteers, applicants] = await Promise.all([getApprovedVolunteers(q || ''), getPendingApplicants(q || '')]);

  if (activeTab === 'approved') {
    return (
      <VolunteersTableClient
        volunteers={volunteers}
        emptyTitle={q ? 'No approved volunteers match your search' : 'No approved volunteers yet'}
        emptyDescription={q ? 'Try a different name or phone number.' : undefined}
      />
    );
  }

  return (
    <div className={tableWrapClass}>
      {applicants.length === 0 ? (
        <EmptyState
          icon={UserRoundCheck}
          title={q ? 'No pending applications match your search' : 'No pending applications'}
          description={q ? 'Try a different name or phone number.' : 'New volunteer applications will show up here.'}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Applicant</th>
              <th className={cn(tableCellClass, 'hidden md:table-cell')}>Why they applied</th>
              <th className={tableCellClass}>Applied</th>
              <th className={tableCellClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a, i) => (
              <PendingApplicantRow key={a.id} applicant={a} index={i} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
