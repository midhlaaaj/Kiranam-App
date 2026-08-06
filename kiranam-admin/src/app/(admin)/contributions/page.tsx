import { Suspense } from 'react';
import { Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { ContributionsChart } from '@/components/charts/ContributionsChart';
import { ContributionsPeriodFilter } from '@/components/ContributionsPeriodFilter';
import { ManualContributionButton } from './ManualContributionButton';
import { SkeletonChart, SkeletonTable } from '@/components/Skeleton';
import { bucketKey, bucketLabel, type Granularity } from '@/lib/timeBuckets';
import {
  badgeClass,
  cardClass,
  formatMoney,
  staggerDelay,
  tableCellClass,
  tableCellNumClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

interface ContributionRow {
  id: string;
  amount: number;
  label: string;
  status: 'success' | 'failed';
  transaction_ref: string | null;
  created_at: string;
  profiles: { full_name: string; phone: string } | null;
  campaigns: { title: string } | null;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const PAGE_SIZE = 25;

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; page?: string }>;
}) {
  const { status, from, to, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ data: rawContributors }, { data: commitments }, { data: activeCampaigns }, { data: paidThisMonthRows }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone').eq('role', 'contributor').order('full_name', { ascending: true }),
    supabase.from('commitments').select('contributor_id, monthly_amount'),
    supabase.from('campaigns').select('id, title').eq('status', 'active').order('title', { ascending: true }),
    supabase.from('contributions').select('contributor_id').eq('status', 'success').gte('created_at', monthStart),
  ]);
  const monthlyAmountByContributor = new Map((commitments || []).map((c) => [c.contributor_id, Number(c.monthly_amount)]));
  const paidThisMonthIds = new Set((paidThisMonthRows || []).map((r) => r.contributor_id));
  const contributors = (rawContributors || []).map((c) => ({
    ...c,
    monthlyAmount: monthlyAmountByContributor.get(c.id) ?? null,
    paidThisMonth: paidThisMonthIds.has(c.id),
  }));

  const todayStr = isoDate(now);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 29);

  const presets = [
    { label: 'Today', from: todayStr, to: todayStr },
    { label: 'This Week', from: isoDate(weekAgo), to: todayStr },
    { label: 'This Month', from: isoDate(monthAgo), to: todayStr },
  ];

  return (
    <div>
      <PageHeading title="Contributions" action={<ManualContributionButton contributors={contributors} campaigns={activeCampaigns || []} />} />

      <div className="mb-6">
        <ContributionsPeriodFilter presets={presets} from={from} to={to} status={status} />
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <SkeletonChart />
            <SkeletonTable rows={7} cols={6} />
          </div>
        }
      >
        <ContributionsResults status={status} from={from} to={to} page={page} />
      </Suspense>
    </div>
  );
}

async function ContributionsResults({
  status,
  from,
  to,
  page,
}: {
  status?: string;
  from?: string;
  to?: string;
  page: number;
}) {
  const offset = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();

  // Lightweight query (no range) for the summary total + chart, across all filtered rows.
  let summaryQuery = supabase
    .from('contributions')
    .select('amount, status, created_at')
    .order('created_at', { ascending: false });
  if (status) summaryQuery = summaryQuery.eq('status', status);
  if (from) summaryQuery = summaryQuery.gte('created_at', from);
  if (to) summaryQuery = summaryQuery.lte('created_at', `${to}T23:59:59`);

  // Paginated query for the table, with joins for display columns.
  let tableQuery = supabase
    .from('contributions')
    .select(
      'id, amount, label, status, transaction_ref, created_at, profiles!contributions_contributor_id_fkey(full_name, phone), campaigns!contributions_campaign_id_fkey(title)'
    )
    .order('created_at', { ascending: false });
  if (status) tableQuery = tableQuery.eq('status', status);
  if (from) tableQuery = tableQuery.gte('created_at', from);
  if (to) tableQuery = tableQuery.lte('created_at', `${to}T23:59:59`);

  const [{ data: summaryData }, { data: pageData }] = await Promise.all([
    summaryQuery,
    tableQuery.range(offset, offset + PAGE_SIZE),
  ]);

  const allFiltered = summaryData || [];

  const rows = (pageData || []) as unknown as ContributionRow[];
  const hasNext = rows.length > PAGE_SIZE;
  const contributions = rows.slice(0, PAGE_SIZE);

  const granularity: Granularity = 'daily';
  const chartBuckets = new Map<string, number>();
  allFiltered
    .filter((c) => c.status === 'success')
    .forEach((c) => {
      const key = bucketKey(new Date(c.created_at), granularity);
      chartBuckets.set(key, (chartBuckets.get(key) || 0) + Number(c.amount));
    });
  const chartData = Array.from(chartBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([key, total]) => ({ label: bucketLabel(key, granularity), total }));

  return (
    <>
      {chartData.length > 0 && (
        <div className={`mb-6 ${cardClass} p-5`}>
          <ContributionsChart data={chartData} />
        </div>
      )}

      <div className={tableWrapClass}>
        {contributions.length === 0 ? (
          <EmptyState icon={Wallet} title="No contributions match these filters" description="Try widening the date range or clearing the status filter." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableCellClass}>Date</th>
                <th className={tableCellClass}>Contributor</th>
                <th className={tableCellClass}>Label</th>
                <th className={tableCellClass}>Amount</th>
                <th className={tableCellClass}>Status</th>
                <th className={tableCellClass}>Transaction Ref</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c, i) => (
                <tr key={c.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {new Date(c.created_at).toLocaleString('en-IN')}
                  </td>
                  <td className={tableCellClass}>
                    <p className="font-semibold text-kiranam-ink">{c.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-kiranam-muted">{c.profiles?.phone}</p>
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>{c.campaigns?.title || c.label}</td>
                  <td className={`${tableCellNumClass} text-kiranam-muted`}>{formatMoney(Number(c.amount))}</td>
                  <td className={tableCellClass}>
                    <span className={badgeClass(c.status === 'success' ? 'success' : 'danger')}>{c.status}</span>
                  </td>
                  <td className={`${tableCellClass} font-mono text-xs text-kiranam-muted-2`}>{c.transaction_ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={page}
        hasNext={hasNext}
        buildHref={(p) => {
          const params = new URLSearchParams();
          if (status) params.set('status', status);
          if (from) params.set('from', from);
          if (to) params.set('to', to);
          params.set('page', String(p));
          return `/contributions?${params.toString()}`;
        }}
      />
    </>
  );
}
