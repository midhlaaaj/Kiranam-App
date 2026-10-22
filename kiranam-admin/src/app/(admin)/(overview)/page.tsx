import { Suspense } from 'react';
import Link from 'next/link';
import { Clock3, HeartHandshake, Megaphone, Users, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/PageHeading';
import { StatCard } from '@/components/StatCard';
import {
  CampaignProgressChart,
  ContributionsChart,
  ContributorGrowthChart,
  StatusBreakdownChart,
  VolunteerGrowthChart,
} from '@/components/charts/lazy';
import { ContributorGrowthFilter } from '@/components/ContributorGrowthFilter';
import { deriveContributorStatus } from '@/lib/volunteerStats';
import { bucketKey, bucketLabel, getBucketsForPage, type Granularity } from '@/lib/timeBuckets';
import { cardClass, formatMoney } from '@/lib/ui';
import { PillTabs } from '@/components/PillTabs';
import { SkeletonChart, SkeletonStatRow } from '@/components/Skeleton';

// One-line toggle: `true` reads the dashboard aggregates from the SQL functions
// in migration 039 (exact, small payload); `false` uses the original path that
// pulls whole tables into the page. The SQL path also falls back to the original
// automatically (with a warning) if the functions aren't deployed yet or fail.
const USE_SQL_AGGREGATES = true;

// Buckets are keyed in the server's local time (see timeBuckets.ts), so the
// database is asked to bucket in that same zone.
const serverTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

type KeyCount = { key: string; count: number };

function toCountMap(rows: KeyCount[]) {
  return new Map(rows.map((r) => [r.key, Number(r.count)]));
}

async function loadLegacyContributorCounts(granularity: Granularity) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('role', 'contributor').not('phone', 'is', null)
    .order('created_at', { ascending: true });

  const counts = new Map<string, number>();
  (data || []).forEach((p) => {
    const key = bucketKey(new Date(p.created_at), granularity);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

async function loadContributorCounts(granularity: Granularity) {
  if (USE_SQL_AGGREGATES) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('dashboard_contributor_growth', {
      p_granularity: granularity,
      p_tz: serverTimeZone(),
    });
    if (!error && Array.isArray(data)) return toCountMap(data as KeyCount[]);
    console.warn('[dashboard] dashboard_contributor_growth failed, using the original query:', error?.message);
  }
  return loadLegacyContributorCounts(granularity);
}

async function getContributorGrowth(cgGranularity: 'weekly' | 'monthly', cgFrom?: string, cgTo?: string) {
  const isCustom = Boolean(cgFrom && cgTo);
  const granularity: Granularity = isCustom ? 'daily' : cgGranularity;

  const counts = await loadContributorCounts(granularity);


  let cumulative = 0;
  let series = Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      cumulative += count;
      return { key, label: bucketLabel(key, granularity), total: cumulative };
    });

  series = isCustom ? series.filter((s) => s.key >= cgFrom! && s.key <= cgTo!) : series.slice(-16);

  return series.map(({ label, total }) => ({ label, total }));
}

type Aggregates = {
  pendingApplications: number;
  contributors: number;
  volunteers: number;
  activeCampaigns: number;
  totalRaised: number;
  contribBuckets: Map<string, number>;
  campaigns: { title: string; raised: number | string; goal: number | string }[];
  volunteerMonthly: Map<string, number>;
  statusCounts: { Active: number; Due: number; Overdue: number; Inactive: number };
};

async function loadLegacyAggregates(granularity: Granularity): Promise<Aggregates> {
  const supabase = await createClient();

  const [
    pendingApplications,
    contributors,
    volunteersCount,
    activeCampaigns,
    contributions,
    campaigns,
    volunteers,
    assignments,
    allCommitments,
  ] = await Promise.all([
    supabase.from('volunteer_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'contributor').not('phone', 'is', null),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'volunteer'),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contributions').select('amount, created_at').eq('status', 'success'),
    // Newest first, matching the campaign lists; the SQL path returns the same order (see below).
    supabase.from('campaigns').select('title, raised, goal').order('created_at', { ascending: false }),
    supabase.from('profiles').select('created_at').eq('role', 'volunteer').order('created_at', { ascending: true }),
    supabase.from('contributor_assignments').select('contributor_id'),
    // Fetched alongside everything else (and filtered below) rather than as
    // a second round trip keyed on the assignment ids.
    supabase.from('commitments').select('contributor_id, autopay_enabled, next_due_date'),
  ]);

  const totalRaised = (contributions.data || []).reduce((sum, c) => sum + Number(c.amount), 0);

  const contribBuckets = new Map<string, number>();
  (contributions.data || []).forEach((c) => {
    const key = bucketKey(new Date(c.created_at), granularity);
    contribBuckets.set(key, (contribBuckets.get(key) || 0) + Number(c.amount));
  });

  const monthlyCounts = new Map<string, number>();
  (volunteers.data || []).forEach((v) => {
    const key = bucketKey(new Date(v.created_at), 'monthly');
    monthlyCounts.set(key, (monthlyCounts.get(key) || 0) + 1);
  });


  const contributorIds = [...new Set((assignments.data || []).map((a) => a.contributor_id))];
  const commitmentByContributor = new Map((allCommitments.data || []).map((c) => [c.contributor_id, c]));
  const statusCounts = { Active: 0, Due: 0, Overdue: 0, Inactive: 0 };
  contributorIds.forEach((id) => {
    const commitment = commitmentByContributor.get(id);
    const status = deriveContributorStatus(commitment);
    if (status === 'active') statusCounts.Active += 1;
    else if (status === 'due') statusCounts.Due += 1;
    else if (status === 'overdue') statusCounts.Overdue += 1;
    else statusCounts.Inactive += 1;
  });

  return {
    pendingApplications: pendingApplications.count ?? 0,
    contributors: contributors.count ?? 0,
    volunteers: volunteersCount.count ?? 0,
    activeCampaigns: activeCampaigns.count ?? 0,
    totalRaised,
    contribBuckets,
    campaigns: campaigns.data || [],
    volunteerMonthly: monthlyCounts,
    statusCounts,
  };
}

async function loadSqlAggregates(granularity: Granularity): Promise<Aggregates | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('dashboard_overview', {
    p_granularity: granularity,
    p_tz: serverTimeZone(),
  });
  if (error || !data) {
    console.warn('[dashboard] dashboard_overview failed, using the original queries:', error?.message);
    return null;
  }
  return {
    pendingApplications: Number(data.pending_applications),
    contributors: Number(data.contributors),
    volunteers: Number(data.volunteers),
    activeCampaigns: Number(data.active_campaigns),
    totalRaised: Number(data.total_raised),
    contribBuckets: new Map((data.contribution_buckets as { key: string; total: number }[]).map((b) => [b.key, Number(b.total)])),
    // dashboard_overview returns campaigns oldest first; the chart lists newest first.
    campaigns: [...data.campaigns].reverse(),
    volunteerMonthly: toCountMap(data.volunteer_monthly as KeyCount[]),
    statusCounts: {
      Active: Number(data.status_counts.Active),
      Due: Number(data.status_counts.Due),
      Overdue: Number(data.status_counts.Overdue),
      Inactive: Number(data.status_counts.Inactive),
    },
  };
}

async function getDashboard(granularity: Granularity, page: number) {
  const agg = (USE_SQL_AGGREGATES ? await loadSqlAggregates(granularity) : null) ?? (await loadLegacyAggregates(granularity));
  const { totalRaised, contribBuckets, statusCounts } = agg;


  // Generate 12 consecutive buckets based on page offset
  const keys = getBucketsForPage(granularity, page);
  const contributionsOverTime = keys.map((key) => {
    const total = contribBuckets.get(key) || 0;
    return { label: bucketLabel(key, granularity), total };
  });

  // Calculate the total in this specific viewed page period
  const totalInPeriod = contributionsOverTime.reduce((sum, c) => sum + c.total, 0);

  // Generate date range label for the UI (e.g. 01-02-2026 to 12-02-2026, or 08/25 to 07/26)
  let activeRangeLabel = '';
  if (keys.length > 0) {
    const firstKey = keys[0];
    const lastKey = keys[keys.length - 1];

    if (granularity === 'daily') {
      const [y1, m1, d1] = firstKey.split('-').map(Number);
      const [y2, m2, d2] = lastKey.split('-').map(Number);
      const fmt = (y: number, m: number, d: number) =>
        `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
      activeRangeLabel = `${fmt(y1, m1, d1)} to ${fmt(y2, m2, d2)}`;
    } else if (granularity === 'weekly') {
      const [y1, m1, d1] = firstKey.split('-').map(Number);
      const [y2, m2, d2] = lastKey.split('-').map(Number);
      const monDate = new Date(y1, m1 - 1, d1);
      const sunDate = new Date(y2, m2 - 1, d2);
      sunDate.setDate(sunDate.getDate() + 6);
      const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      activeRangeLabel = `${fmt(monDate)} to ${fmt(sunDate)}`;
    } else if (granularity === 'monthly') {
      const [y1, m1] = firstKey.split('-').map(Number);
      const [y2, m2] = lastKey.split('-').map(Number);
      const fmt = (y: number, m: number) =>
        `${String(m).padStart(2, '0')}/${String(y).slice(-2)}`;
      activeRangeLabel = `${fmt(y1, m1)} to ${fmt(y2, m2)}`;
    }
  }

  const campaignProgress = agg.campaigns.map((c) => ({
    title: c.title,
    pct: Number(c.goal) > 0 ? Math.min(100, Math.round((Number(c.raised) / Number(c.goal)) * 100)) : 0,
  }));

  let cumulative = 0;
  const volunteerGrowth = Array.from(agg.volunteerMonthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      cumulative += count;
      return { label: bucketLabel(key, 'monthly'), total: cumulative };
    });

  return {
    pendingApplications: agg.pendingApplications,
    contributors: agg.contributors,
    volunteers: agg.volunteers,
    activeCampaigns: agg.activeCampaigns,

    totalRaised,
    contributionsOverTime,
    totalInPeriod,
    activeRangeLabel,
    campaignProgress,
    volunteerGrowth,
    statusBreakdown: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
  };
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string; cgRange?: string; cgFrom?: string; cgTo?: string }>;
}) {
  const { range, page: pageStr, cgRange, cgFrom, cgTo } = await searchParams;
  const granularity: Granularity = range === 'daily' || range === 'monthly' ? range : 'weekly';
  const page = Math.max(0, parseInt(pageStr || '0', 10) || 0);
  const contributorGranularity: 'weekly' | 'monthly' = cgRange === 'monthly' ? 'monthly' : 'weekly';

  return (
    <div>
      <PageHeading title="Overview" />
      <Suspense
        fallback={
          <div>
            <SkeletonStatRow count={5} />
            <div className="mt-6">
              <SkeletonChart />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <div className="mt-6">
              <SkeletonChart />
            </div>
          </div>
        }
      >
        <DashboardBody
          granularity={granularity}
          page={page}
          contributorGranularity={contributorGranularity}
          cgFrom={cgFrom}
          cgTo={cgTo}
        />
      </Suspense>
    </div>
  );
}

async function DashboardBody({
  granularity,
  page,
  contributorGranularity,
  cgFrom,
  cgTo,
}: {
  granularity: Granularity;
  page: number;
  contributorGranularity: 'weekly' | 'monthly';
  cgFrom?: string;
  cgTo?: string;
}) {
  const [data, contributorGrowth] = await Promise.all([
    getDashboard(granularity, page),
    getContributorGrowth(contributorGranularity, cgFrom, cgTo),
  ]);

  const cards = [
    { label: 'Pending Applications', value: data.pendingApplications.toString(), icon: Clock3, href: '/volunteers?tab=pending' },
    { label: 'Contributors', value: data.contributors.toString(), icon: Users, href: '/contributors' },
    { label: 'Coordinators', value: data.volunteers.toString(), icon: HeartHandshake, href: '/volunteers' },
    { label: 'Active Campaigns', value: data.activeCampaigns.toString(), icon: Megaphone, href: '/campaigns?status=active' },
    { label: 'Total Contributed', value: formatMoney(data.totalRaised), icon: Wallet, href: '/contributions' },
  ];

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((card, i) => (
          <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} index={i} href={card.href} />
        ))}
      </div>

      <div className={`mt-6 ${cardClass} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Contributions Over Time</h2>
            <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold tracking-tight tabular-nums text-kiranam-primary">
                {formatMoney(data.totalInPeriod)}
              </span>
              {data.activeRangeLabel && (
                <span className="text-xs text-kiranam-muted font-medium">
                  ({data.activeRangeLabel})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/?range=${granularity}&page=${page + 1}`}
              scroll={false}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-kiranam-border-strong bg-kiranam-surface text-kiranam-ink shadow-elevation-sm transition hover:bg-kiranam-surface-alt active:scale-95 cursor-pointer"
              title="Previous period"
            >
              <ChevronLeft size={16} />
            </Link>
            {page > 0 ? (
              <Link
                href={`/?range=${granularity}&page=${page - 1}`}
                scroll={false}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-kiranam-border-strong bg-kiranam-surface text-kiranam-ink shadow-elevation-sm transition hover:bg-kiranam-surface-alt active:scale-95 cursor-pointer"
                title="Next period"
              >
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-kiranam-border bg-kiranam-surface-alt text-kiranam-muted-2 cursor-not-allowed opacity-50"
                title="No next period"
              >
                <ChevronRight size={16} />
              </span>
            )}
            <PillTabs
              label="Group by"
              items={(['daily', 'weekly', 'monthly'] as const).map((g) => ({
                key: g,
                label: g.charAt(0).toUpperCase() + g.slice(1),
                href: `/?range=${g}&page=0`,
                active: granularity === g,
                scroll: false,
              }))}
            />
          </div>
        </div>
        <div className="mt-4">
          {data.contributionsOverTime.length > 0 ? (
            <ContributionsChart data={data.contributionsOverTime} />
          ) : (
            <p className="py-16 text-center text-sm text-kiranam-muted">No contributions yet.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className={`${cardClass} p-5`}>
          <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Campaign Funding Progress</h2>
          <div className="mt-4">
            {data.campaignProgress.length > 0 ? (
              <CampaignProgressChart data={data.campaignProgress} />
            ) : (
              <p className="py-16 text-center text-sm text-kiranam-muted">No campaigns yet.</p>
            )}
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Contributor Status Breakdown</h2>
          <div className="mt-4">
            <StatusBreakdownChart data={data.statusBreakdown} />
          </div>
        </div>
      </div>

      <div className={`mt-6 ${cardClass} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Contributor Growth</h2>
          <ContributorGrowthFilter granularity={contributorGranularity} from={cgFrom} to={cgTo} />
        </div>
        <div className="mt-4">
          {contributorGrowth.length > 0 ? (
            <ContributorGrowthChart data={contributorGrowth} />
          ) : (
            <p className="py-16 text-center text-sm text-kiranam-muted">No contributors yet.</p>
          )}
        </div>
      </div>

      <div className={`mt-6 ${cardClass} p-5`}>
        <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">Coordinator Growth</h2>
        <div className="mt-4">
          <VolunteerGrowthChart data={data.volunteerGrowth} />
        </div>
      </div>
    </>
  );
}
