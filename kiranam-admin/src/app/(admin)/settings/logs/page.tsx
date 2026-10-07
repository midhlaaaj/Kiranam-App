import { Fragment, Suspense } from 'react';
import Link from 'next/link';
import { Download, ScrollText } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { SkeletonTable } from '@/components/Skeleton';
import {
  ActiveFilters,
  FilterBar,
  FilterPeriod,
  FilterResults,
  FilterRoot,
  FilterSearch,
  FilterSelect,
  type ActiveChip,
  type FilterOption,
} from '@/components/filters/FilterBar';
import { AUDIT_AREAS, areaLabel, areaOf, describeLogEntry, type LogPart } from '@/lib/auditDescriptions';
import {
  auditAdminOptions,
  parseAuditFilters,
  queryAuditLog,
  resolveLogNames,
  type AuditLogFilters,
} from '@/lib/auditLogQuery';
import {
  describePeriod,
  formatDateTimeFull,
  formatDayHeading,
  formatRelative,
  formatTime,
  isoDay,
  periodPresets,
} from '@/lib/format';
import { badgeClass, buttonSecondary, tableCellClass, tableHeadRowClass, tableWrapClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
type SearchParams = { page?: string; q?: string; area?: string; adminId?: string; from?: string; to?: string };

// Heading + tabs come from settings/layout.tsx.
export default async function ActivityLogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = parseAuditFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const exportParams = new URLSearchParams(
    Object.entries(filters).filter((e): e is [string, string] => !!e[1])
  ).toString();

  return (
    <FilterRoot>
      <Suspense fallback={<div className="h-9" />}>
        <LogToolbar filters={filters} exportHref={`/settings/logs/export${exportParams ? `?${exportParams}` : ''}`} />
      </Suspense>
      <div className="mt-4">
        <FilterResults>
          <Suspense key={JSON.stringify(filters) + page} fallback={<SkeletonTable rows={8} cols={4} />}>
            <LogsTable filters={filters} page={page} />
          </Suspense>
        </FilterResults>
      </div>
    </FilterRoot>
  );
}

async function LogToolbar({ filters, exportHref }: { filters: AuditLogFilters; exportHref: string }) {
  const admins: FilterOption[] = await auditAdminOptions();
  const areaOptions: FilterOption[] = AUDIT_AREAS.map((a) => ({ value: a.value, label: a.label }));
  const period = describePeriod(filters.from, filters.to);

  const chips: ActiveChip[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, params: ['q'] });
  if (period) chips.push({ label: period, params: ['from', 'to'] });
  if (filters.area) chips.push({ label: `Area: ${areaLabel(filters.area as never)}`, params: ['area'] });
  if (filters.adminId) {
    const name = admins.find((a) => a.value === filters.adminId)?.label ?? 'Unknown';
    chips.push({ label: `By: ${name}`, params: ['adminId'] });
  }

  return (
    <>
      <FilterBar
        actions={
          <Link href={exportHref} prefetch={false} className={cn(buttonSecondary, 'h-9 px-3.5 py-0')}>
            <Download size={16} aria-hidden />
            Export CSV
          </Link>
        }
      >
        <FilterSearch placeholder="Search names, titles, emails…" label="Search activity" />
        <FilterPeriod presets={periodPresets()} activeLabel={period} />
        <FilterSelect param="area" label="Area" options={areaOptions} />
        <FilterSelect param="adminId" label="By" allLabel="Anyone" options={admins} />
      </FilterBar>
      <ActiveFilters chips={chips} />
    </>
  );
}

function renderParts(parts: LogPart[]) {
  return parts.map((part, i) =>
    typeof part === 'string' ? (
      <Fragment key={i}>{part}</Fragment>
    ) : part.href ? (
      <Link key={i} href={part.href} className="font-semibold text-kiranam-ink underline-offset-2 hover:underline">
        {part.text}
      </Link>
    ) : (
      <span key={i} className="font-semibold text-kiranam-ink">
        {part.text}
      </span>
    )
  );
}

async function LogsTable({ filters, page }: { filters: AuditLogFilters; page: number }) {
  const from = (page - 1) * PAGE_SIZE;
  const { rows, count } = await queryAuditLog(filters, { from, to: from + PAGE_SIZE - 1 });
  const names = await resolveLogNames(rows);
  const filtered = Boolean(filters.q || filters.area || filters.adminId || filters.from);

  if (rows.length === 0) {
    return (
      <div className={tableWrapClass}>
        <EmptyState
          icon={ScrollText}
          title={filtered ? 'No activity matches these filters' : 'No admin activity yet'}
          description={filtered ? 'Try a wider date range, or clear a filter.' : 'Changes admins make will show up here.'}
        />
      </div>
    );
  }

  const now = new Date();
  const dayHeadings = rows.map((log, i) => {
    const day = isoDay(log.created_at);
    return i === 0 || day !== isoDay(rows[i - 1].created_at) ? formatDayHeading(log.created_at, now) : null;
  });

  return (
    <>
      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={cn(tableCellClass, 'w-28')}>Time</th>
              <th className={tableCellClass}>Who</th>
              <th className={tableCellClass}>What happened</th>
              <th className={cn(tableCellClass, 'hidden md:table-cell')}>Area</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log, i) => {
              const dayHeading = dayHeadings[i];
              const recent = now.getTime() - new Date(log.created_at).getTime() < 6 * 3600 * 1000;
              return (
                <Fragment key={log.id}>
                  {dayHeading && (
                    <tr className="bg-kiranam-surface-alt">
                      <th
                        colSpan={4}
                        scope="colgroup"
                        className="px-5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-kiranam-muted"
                      >
                        {dayHeading}
                      </th>
                    </tr>
                  )}
                  <tr className="border-b border-kiranam-border last:border-0 align-top">
                    <td className={cn(tableCellClass, 'whitespace-nowrap tabular-nums text-kiranam-muted')}>
                      <time dateTime={log.created_at} title={formatDateTimeFull(log.created_at)}>
                        {recent ? formatRelative(log.created_at, now) : formatTime(log.created_at)}
                      </time>
                    </td>
                    <td className={cn(tableCellClass, 'whitespace-nowrap text-kiranam-ink')}>
                      {log.profiles?.full_name || log.profiles?.email || 'Unknown'}
                    </td>
                    <td className={cn(tableCellClass, 'text-kiranam-ink')}>
                      {renderParts(describeLogEntry(log, names))}
                    </td>
                    <td className={cn(tableCellClass, 'hidden md:table-cell')}>
                      <span className={badgeClass('neutral')}>{areaLabel(areaOf(log.action))}</span>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        hasNext={from + rows.length < count}
        total={count}
        pageSize={PAGE_SIZE}
        noun="actions"
        buildHref={(p) => {
          const params = new URLSearchParams(
            Object.entries(filters).filter((e): e is [string, string] => !!e[1])
          );
          params.set('page', String(p));
          return `/settings/logs?${params.toString()}`;
        }}
      />
    </>
  );
}
