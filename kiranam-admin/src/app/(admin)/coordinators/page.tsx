import { Suspense } from 'react';
import { UserRoundCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { PendingApplicantRow } from './PendingApplicantRow';
import { CoordinatorsRegisterPanel } from './CoordinatorsRegisterPanel';
import { CoordinatorsTableClient } from './CoordinatorsTableClient';
import { PillTabs } from '@/components/PillTabs';
import { FilterResults, FilterRoot, FilterSearch } from '@/components/filters/FilterBar';
import { tableCellClass, tableHeadRowClass, tableWrapClass } from '@/lib/ui';
import { searchTerm } from '@/lib/search';
import { cn } from '@/lib/utils';

async function getApprovedCoordinators(query: string) {
  const supabase = await createClient();

  let request = supabase
    .from('profiles')
    .select('id, full_name, phone, created_at')
    .eq('role', 'coordinator')
    .order('created_at', { ascending: false });

  const term = searchTerm(query);
  if (term) {
    request = request.or(`full_name.ilike.*${term}*,phone.ilike.*${term.replace(/\D/g, '') || term}*`);
  }

  const { data: coordinators } = await request;

  const ids = (coordinators || []).map((v) => v.id);

  const [{ data: referrals }, { data: assignments }] = await Promise.all([
    ids.length
      ? supabase.from('referrals').select('coordinator_id, referral_code').in('coordinator_id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from('contributor_assignments').select('coordinator_id').in('coordinator_id', ids)
      : Promise.resolve({ data: [] }),
  ]);

  const referralByCoordinator = new Map((referrals || []).map((r) => [r.coordinator_id, r.referral_code]));
  const assignmentCounts = new Map<string, number>();
  (assignments || []).forEach((a) => {
    assignmentCounts.set(a.coordinator_id, (assignmentCounts.get(a.coordinator_id) || 0) + 1);
  });

  return (coordinators || []).map((v) => ({
    ...v,
    referralCode: referralByCoordinator.get(v.id) ?? '—',
    assignedCount: assignmentCounts.get(v.id) ?? 0,
  }));
}

async function getPendingApplicants(query: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('coordinator_applications')
    .select('id, created_at, motivation, profiles!coordinator_applications_profile_id_fkey(id, full_name, phone)')
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

async function CoordinatorTabs({ render }: { render: (pendingCount: number) => React.ReactNode }) {
  return render(await getPendingCount());
}

async function getPendingCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('coordinator_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  return count ?? 0;
}

export default async function CoordinatorsPage({
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
          href: `/coordinators?tab=approved${q ? `&q=${encodeURIComponent(q)}` : ''}`,
          active: activeTab === 'approved',
        },
        {
          key: 'pending',
          label: 'Pending applications',
          href: `/coordinators?tab=pending${q ? `&q=${encodeURIComponent(q)}` : ''}`,
          active: activeTab === 'pending',
          count: pendingCount,
        },
      ]}
    />
  );
  const filterPills = (
    <Suspense fallback={tabs()}>
      <CoordinatorTabs render={tabs} />
    </Suspense>
  );

  return (
    <FilterRoot>
      <CoordinatorsRegisterPanel
        filters={filterPills}
        search={<FilterSearch placeholder="Search by name or phone" label="Search coordinators" />}
      />

      <FilterResults>
        <Suspense key={`${activeTab}:${q ?? ''}`} fallback={<SkeletonTable rows={7} cols={4} />}>
          <CoordinatorsTable activeTab={activeTab} q={q} />
        </Suspense>
      </FilterResults>
    </FilterRoot>
  );
}

async function CoordinatorsTable({ activeTab, q }: { activeTab: 'approved' | 'pending'; q?: string }) {
  const [coordinators, applicants] = await Promise.all([getApprovedCoordinators(q || ''), getPendingApplicants(q || '')]);

  if (activeTab === 'approved') {
    return (
      <CoordinatorsTableClient
        coordinators={coordinators}
        emptyTitle={q ? 'No approved coordinators match your search' : 'No approved coordinators yet'}
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
          description={q ? 'Try a different name or phone number.' : 'New coordinator applications will show up here.'}
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
