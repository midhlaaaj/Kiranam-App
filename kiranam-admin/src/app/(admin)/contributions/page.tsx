import { Suspense } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { ContributionsChart } from '@/components/charts/ContributionsChart';
import { ManualContributionButton } from './ManualContributionButton';
import { Skeleton, SkeletonChart, SkeletonTable } from '@/components/Skeleton';
import {
  ActiveFilters,
  FilterBar,
  FilterPeriod,
  FilterResults,
  FilterRoot,
  FilterSearch,
  FilterSelect,
  type ActiveChip,
} from '@/components/filters/FilterBar';
import {
  describePeriod,
  formatDateTime,
  formatDateTimeFull,
  isIsoDay,
  isoDay,
  istRangeBounds,
  periodPresets,
} from '@/lib/format';
import { searchTerm } from '@/lib/search';
import {
  badgeClass,
  cardClass,
  formatMoney,
  tableCellClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';
import { cn } from '@/lib/utils';

interface ContributionRow {
  id: string;
  contributor_id: string;
  amount: number;
  label: string;
  status: 'success' | 'failed';
  transaction_ref: string | null;
  is_offline: boolean | null;
  created_at: string;
  profiles: { full_name: string; phone: string } | null;
  campaigns: { title: string } | null;
}

interface Filters {
  q?: string;
  status?: 'success' | 'failed';
  campaign?: string; // campaign id, or 'general' for no campaign
  from?: string;
  to?: string;
}

const PAGE_SIZE = 25;
const STATUS_LABEL = { success: 'Paid', failed: 'Failed' } as const;

type SP = { q?: string; status?: string; campaign?: string; from?: string; to?: string; page?: string };

function parseFilters(sp: SP): Filters {
  const hasRange = isIsoDay(sp.from) && isIsoDay(sp.to) && sp.from! <= sp.to!;
  return {
    q: sp.q?.trim() || undefined,
    status: sp.status === 'success' || sp.status === 'failed' ? sp.status : undefined,
    campaign: sp.campaign || undefined,
    from: hasRange ? sp.from : undefined,
    to: hasRange ? sp.to : undefined,
  };
}

export default async function ContributionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);

  return (
    <div>
      <PageHeading
        title="Contributions"
        description="Every payment received, online and offline."
        action={<ManualContributionButton />}
      />
      <FilterRoot>
        <Suspense fallback={<Skeleton className="h-9 w-full max-w-2xl rounded-full" />}>
          <Toolbar filters={filters} />
        </Suspense>
        <div className="mt-5">
          <FilterResults>
            <Suspense
              key={JSON.stringify(filters) + page}
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-20 rounded-lg" />
                  <SkeletonChart />
                  <SkeletonTable rows={7} cols={6} />
                </div>
              }
            >
              <ContributionsResults filters={filters} page={page} />
            </Suspense>
          </FilterResults>
        </div>
      </FilterRoot>
    </div>
  );
}

async function Toolbar({ filters }: { filters: Filters }) {
  const supabase = await createClient();
  const { data: campaigns } = await supabase.from('campaigns').select('id, title').order('created_at', { ascending: false });
  const campaignOptions = [
    { value: 'general', label: 'General (no campaign)' },
    ...(campaigns || []).map((c) => ({ value: c.id as string, label: c.title as string })),
  ];
  const period = describePeriod(filters.from, filters.to);

  const chips: ActiveChip[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, params: ['q'] });
  if (period) chips.push({ label: period, params: ['from', 'to'] });
  if (filters.status) chips.push({ label: `Status: ${STATUS_LABEL[filters.status]}`, params: ['status'] });
  if (filters.campaign) {
    chips.push({ label: `For: ${campaignOptions.find((c) => c.value === filters.campaign)?.label ?? 'Campaign'}`, params: ['campaign'] });
  }

  return (
    <>
      <FilterBar>
        <FilterSearch placeholder="Name, phone or transaction ref" label="Search contributions" />
        <FilterPeriod presets={periodPresets()} activeLabel={period} />
        <FilterSelect
          param="status"
          label="Status"
          options={[
            { value: 'success', label: 'Paid' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
        <FilterSelect param="campaign" label="For" options={campaignOptions} />
      </FilterBar>
      <ActiveFilters chips={chips} />
    </>
  );
}

// PostgREST returns at most 1000 rows per request — page through so totals
// are right for busy periods (the old single query silently capped them).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder generics
async function fetchAllSummaryRows(build: () => any) {
  const rows: { amount: number; status: string; created_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as typeof rows));
    if (!data || data.length < 1000) return rows;
  }
}


async function ContributionsResults({ filters, page }: { filters: Filters; page: number }) {
  const offset = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();

  // Search matches contributor name/phone (via a profile lookup) or the
  // transaction reference.
  let contributorIds: string[] | null = null;
  const term = searchTerm(filters.q);
  if (term) {
    const { data: people } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.*${term}*,phone.ilike.*${term.replace(/\D/g, '') || term}*`)
      .limit(200);
    contributorIds = (people || []).map((p) => p.id as string);
  }

  // Same filters for the totals query and the paged table query.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder generics
  const applyFilters = (q: any) => {
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.campaign === 'general') q = q.is('campaign_id', null);
    else if (filters.campaign) q = q.eq('campaign_id', filters.campaign);
    if (filters.from && filters.to) {
      const { gte, lte } = istRangeBounds(filters.from, filters.to);
      q = q.gte('created_at', gte).lte('created_at', lte);
    }
    if (term) {
      const ors = [`transaction_ref.ilike.*${term}*`];
      if (contributorIds && contributorIds.length) ors.push(`contributor_id.in.(${contributorIds.join(',')})`);
      q = q.or(ors.join(','));
    }
    return q;
  };

  const [summaryRows, { data: pageData, count }] = await Promise.all([
    fetchAllSummaryRows(() =>
      applyFilters(supabase.from('contributions').select('amount, status, created_at').order('created_at', { ascending: false }))
    ),
    applyFilters(
      supabase
        .from('contributions')
        .select(
          'id, contributor_id, amount, label, status, transaction_ref, is_offline, created_at, profiles!contributions_contributor_id_fkey(full_name, phone), campaigns!contributions_campaign_id_fkey(title)',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
    ).range(offset, offset + PAGE_SIZE - 1) as Promise<{ data: unknown[] | null; count: number | null }>,
  ]);

  const contributions = (pageData || []) as unknown as ContributionRow[];
  const total = count ?? 0;
  const paid = summaryRows.filter((c) => c.status === 'success');
  const paidTotal = paid.reduce((sum, c) => sum + Number(c.amount), 0);
  const failedCount = summaryRows.length - paid.length;
  const filtered = Boolean(filters.q || filters.status || filters.campaign || filters.from);

  // Daily totals in India time (bucketing on the server's UTC clock put
  // late-evening payments on the next day).
  const byDay = new Map<string, number>();
  for (const c of paid) {
    const key = isoDay(c.created_at);
    byDay.set(key, (byDay.get(key) || 0) + Number(c.amount));
  }
  const chartData = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([key, value]) => ({
      label: new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }),
      total: value,
    }));

  return (
    <>
      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={cn(cardClass, 'p-4')}>
          <dt className="text-sm text-kiranam-muted">Received</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-kiranam-ink">{formatMoney(paidTotal)}</dd>
        </div>
        <div className={cn(cardClass, 'p-4')}>
          <dt className="text-sm text-kiranam-muted">Payments</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-kiranam-ink">{paid.length.toLocaleString('en-IN')}</dd>
        </div>
        <div className={cn(cardClass, 'col-span-2 p-4 sm:col-span-1')}>
          <dt className="text-sm text-kiranam-muted">Failed</dt>
          <dd className={cn('mt-1 text-2xl font-bold tabular-nums', failedCount > 0 ? 'text-kiranam-danger' : 'text-kiranam-ink')}>
            {failedCount.toLocaleString('en-IN')}
          </dd>
        </div>
      </dl>

      {chartData.length > 1 && (
        <section className={cn('mb-6', cardClass, 'p-5')} aria-labelledby="contrib-chart-heading">
          <h2 id="contrib-chart-heading" className="mb-3 text-sm font-semibold text-kiranam-ink">
            Received per day <span className="font-normal text-kiranam-muted">· {formatMoney(paidTotal)} total</span>
          </h2>
          <ContributionsChart data={chartData} />
        </section>
      )}

      <div className={tableWrapClass}>
        {contributions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={filtered ? 'No contributions match these filters' : 'No contributions yet'}
            description={filtered ? 'Try a wider date range or clear a filter.' : 'Payments from the app and offline payments you record will appear here.'}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableCellClass}>Date</th>
                <th className={tableCellClass}>Contributor</th>
                <th className={cn(tableCellClass, 'hidden md:table-cell')}>For</th>
                <th className={cn(tableCellClass, 'text-right')}>Amount</th>
                <th className={tableCellClass}>Status</th>
                <th className={cn(tableCellClass, 'hidden lg:table-cell')}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c.id} className={tableRowClass}>
                  <td className={cn(tableCellClass, 'whitespace-nowrap text-kiranam-muted')}>
                    <time dateTime={c.created_at} title={formatDateTimeFull(c.created_at)}>
                      {formatDateTime(c.created_at)}
                    </time>
                  </td>
                  <td className={tableCellClass}>
                    <Link href={`/contributors/${c.contributor_id}`} className="font-semibold text-kiranam-ink underline-offset-2 hover:underline">
                      {c.profiles?.full_name || 'Unknown'}
                    </Link>
                    <p className="text-xs tabular-nums text-kiranam-muted">{c.profiles?.phone}</p>
                  </td>
                  <td className={cn(tableCellClass, 'hidden text-kiranam-ink md:table-cell')}>{c.campaigns?.title || c.label}</td>
                  <td className={cn(tableCellClass, 'text-right font-semibold tabular-nums text-kiranam-ink')}>{formatMoney(Number(c.amount))}</td>
                  <td className={tableCellClass}>
                    <span className={badgeClass(c.status === 'success' ? 'success' : 'danger')}>{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td className={cn(tableCellClass, 'hidden text-xs text-kiranam-muted lg:table-cell')}>
                    {c.is_offline ? <span className={badgeClass('neutral')}>Offline</span> : <span className="font-mono">{c.transaction_ref || '—'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={page}
        hasNext={offset + contributions.length < total}
        total={total}
        pageSize={PAGE_SIZE}
        noun="contributions"
        buildHref={(p) => {
          const params = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => !!e[1]));
          params.set('page', String(p));
          return `/contributions?${params.toString()}`;
        }}
      />
    </>
  );
}
