import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MobileToolbar } from '@/components/MobileToolbar';
import { SkeletonTable } from '@/components/Skeleton';
import { ContributorsRegisterPanel } from './ContributorsRegisterPanel';
import { ContributorsTableClient } from './ContributorsTableClient';
import { deriveContributorStatus, type ContributorStatus } from '@/lib/volunteerStats';
import { PillTabs } from '@/components/PillTabs';
import { FilterResults, FilterRoot, FilterSearch } from '@/components/filters/FilterBar';
import { searchTerm } from '@/lib/search';
import { buttonSecondary } from '@/lib/ui';

const STATUS_LABEL: Record<ContributorStatus, string> = {
  active: 'Active',
  due: 'Due',
  overdue: 'Overdue',
  inactive: 'Inactive',
};

export default async function ContributorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const filterPills = (
    <PillTabs
      label="Status"
      items={[
        {
          key: 'all',
          label: 'All',
          href: `/contributors${q ? `?q=${encodeURIComponent(q)}` : ''}`,
          active: !status,
        },
        ...(['active', 'due', 'overdue', 'inactive'] as const).map((s) => ({
          key: s,
          label: STATUS_LABEL[s],
          href: `/contributors?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
          active: status === s,
        })),
      ]}
    />
  );

  const searchBox = <FilterSearch placeholder="Search by name or phone" label="Search contributors" />;

  return (
    <FilterRoot>
      <ContributorsRegisterPanel
        filters={filterPills}
        search={
          <div className="flex flex-wrap items-center gap-3">
            {searchBox}
            <Link href="/contributors/export" className={buttonSecondary}>
              Export CSV
            </Link>
          </div>
        }
        mobileToolbar={<MobileToolbar filters={filterPills} search={searchBox} exportHref="/contributors/export" />}
      />

      <FilterResults>
        <Suspense key={`${q ?? ''}:${status ?? ''}`} fallback={<SkeletonTable rows={7} cols={4} />}>
          <ContributorsTable q={q} status={status} />
        </Suspense>
      </FilterResults>
    </FilterRoot>
  );
}

async function ContributorsTable({ q, status }: { q?: string; status?: string }) {
  const supabase = await createClient();

  let request = supabase
    .from('profiles')
    .select('id, full_name, phone, email, kk_number, created_at')
    .eq('role', 'contributor')
    .order('created_at', { ascending: false });

  const term = searchTerm(q);
  if (term) {
    request = request.or(`full_name.ilike.*${term}*,phone.ilike.*${term.replace(/\D/g, '') || term}*`);
  }

  const { data: rawContributors } = await request;
  const ids = (rawContributors || []).map((c) => c.id);

  const { data: commitments } = ids.length
    ? await supabase
        .from('commitments')
        .select('contributor_id, monthly_amount, autopay_enabled, next_due_date')
        .in('contributor_id', ids)
    : { data: [] };

  const commitmentByContributor = new Map((commitments || []).map((c) => [c.contributor_id, c]));

  const allContributors = (rawContributors || []).map((c) => {
    const commitment = commitmentByContributor.get(c.id);
    return {
      ...c,
      monthlyAmount: commitment?.monthly_amount ?? null,
      status: deriveContributorStatus(commitment),
    };
  });

  const contributors = status ? allContributors.filter((c) => c.status === status) : allContributors;

  return (
    <ContributorsTableClient
      contributors={contributors}
      emptyTitle={q || status ? 'No contributors match these filters' : 'No contributors yet'}
      emptyDescription={q || status ? 'Try a different search or status filter.' : undefined}
    />
  );
}
