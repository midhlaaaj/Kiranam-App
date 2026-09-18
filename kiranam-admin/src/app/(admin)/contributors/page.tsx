import { Suspense } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AddNewPanel } from '@/components/AddNewPanel';
import { NotificationBell } from '@/components/NotificationBell';
import { MobileToolbar } from '@/components/MobileToolbar';
import { SkeletonTable } from '@/components/Skeleton';
import { RegisterContributorForm } from './RegisterContributorForm';
import { ContributorsTableClient } from './ContributorsTableClient';
import { deriveContributorStatus, type ContributorStatus } from '@/lib/volunteerStats';
import { PillTabs } from '@/components/PillTabs';
import { buttonPrimary, buttonSecondary, inputClass } from '@/lib/ui';

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

  const searchForm = (
    <form className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-kiranam-muted" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or phone…"
          className={`${inputClass} w-64 pl-9`}
        />
      </div>
      {status && <input type="hidden" name="status" value={status} />}
      <button type="submit" className={buttonPrimary}>
        Search
      </button>
    </form>
  );

  return (
    <div>
      <AddNewPanel
        title="Contributors"
        label="Register contributor"
        description="For a contributor who committed offline and hasn't signed up in the app yet."
        bell={<NotificationBell />}
        modal
        filters={filterPills}
        search={
          <div className="flex flex-wrap items-center gap-3">
            {searchForm}
            <Link href="/contributors/export" className={buttonSecondary}>
              Export CSV
            </Link>
          </div>
        }
        mobileToolbar={<MobileToolbar filters={filterPills} search={searchForm} exportHref="/contributors/export" />}
      >
        <RegisterContributorForm />
      </AddNewPanel>

      <Suspense fallback={<SkeletonTable rows={7} cols={4} />}>
        <ContributorsTable q={q} status={status} />
      </Suspense>
    </div>
  );
}

async function ContributorsTable({ q, status }: { q?: string; status?: string }) {
  const supabase = await createClient();

  let request = supabase
    .from('profiles')
    .select('id, full_name, phone, email, kk_number, created_at')
    .eq('role', 'contributor')
    .order('created_at', { ascending: false });

  if (q) {
    request = request.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
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
