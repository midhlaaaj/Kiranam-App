import { Suspense } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AddNewPanel } from '@/components/AddNewPanel';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { RegisterContributorForm } from './RegisterContributorForm';
import { deriveContributorStatus, type ContributorStatus } from '@/lib/volunteerStats';
import { PillTabs } from '@/components/PillTabs';
import {
  badgeClass,
  buttonPrimary,
  buttonSecondary,
  formatMoney,
  inputClass,
  staggerDelay,
  tableCellClass,
  tableCellNumClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

const STATUS_LABEL: Record<ContributorStatus, string> = {
  active: 'Active',
  due: 'Due',
  overdue: 'Overdue',
  inactive: 'Inactive',
};

const STATUS_TONE: Record<ContributorStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  due: 'warning',
  overdue: 'danger',
  inactive: 'neutral',
};

export default async function ContributorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  return (
    <div>
      <AddNewPanel
        title="Contributors"
        label="Register contributor"
        description="For a contributor who committed offline and hasn't signed up in the app yet."
        modal
        filters={
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
        }
        search={
          <div className="flex flex-wrap items-center gap-3">
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
            <Link href="/contributors/export" className={buttonSecondary}>
              Export CSV
            </Link>
          </div>
        }
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
    .select('id, full_name, phone, email, created_at')
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
    <div className={tableWrapClass}>
      {contributors.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || status ? 'No contributors match these filters' : 'No contributors yet'}
          description={q || status ? 'Try a different search or status filter.' : undefined}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Name</th>
              <th className={tableCellClass}>Phone</th>
              <th className={tableCellClass}>Monthly Amount</th>
              <th className={tableCellClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((c, i) => (
              <tr key={c.id} className={tableRowClass} style={staggerDelay(i)}>
                <td className={tableCellClass}>
                  <Link href={`/contributors/${c.id}`} className="font-semibold text-kiranam-ink hover:text-kiranam-primary hover:underline">
                    {c.full_name || 'Unnamed'}
                  </Link>
                </td>
                <td className={`${tableCellClass} text-kiranam-muted`}>{c.phone}</td>
                <td className={`${tableCellNumClass} text-kiranam-muted`}>
                  {c.monthlyAmount ? formatMoney(Number(c.monthlyAmount)) : '—'}
                </td>
                <td className={tableCellClass}>
                  <span className={badgeClass(STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
