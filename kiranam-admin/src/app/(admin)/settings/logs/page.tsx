import { Suspense } from 'react';
import { ScrollText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { LogsFilters } from '@/components/LogsFilters';
import { SettingsTabs } from '../SettingsTabs';
import { describeLogEntry } from '@/lib/auditDescriptions';
import { Skeleton, SkeletonTable } from '@/components/Skeleton';
import { staggerDelay, tableCellClass, tableHeadRowClass, tableRowClass, tableWrapClass } from '@/lib/ui';

interface LogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string; email: string | null } | null;
}

interface AdminRow {
  id: string;
  full_name: string;
  email: string;
}

const PAGE_SIZE = 25;
const ENTITY_TYPES = [
  'campaigns',
  'campaign_images',
  'events',
  'event_images',
  'volunteer_applications',
  'contributor_assignments',
  'notifications',
  'admin_invites',
  'profiles',
];

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entityType?: string; adminId?: string }>;
}) {
  const { page: pageParam, entityType, adminId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  return (
    <div>
      <PageHeading title="Settings" description="Most recent admin actions." />
      <div className="mb-6">
        <SettingsTabs active="logs" />
      </div>

      <div className="mb-4">
        <Suspense fallback={<div className="flex flex-wrap gap-3"><Skeleton className="h-10 w-44" /><Skeleton className="h-10 w-44" /></div>}>
          <LogsFiltersData entityType={entityType} adminId={adminId} />
        </Suspense>
      </div>

      <Suspense fallback={<SkeletonTable rows={8} cols={4} />}>
        <LogsTable entityType={entityType} adminId={adminId} page={page} />
      </Suspense>
    </div>
  );
}

async function LogsFiltersData({ entityType, adminId }: { entityType?: string; adminId?: string }) {
  const supabase = await createClient();
  const { data: adminData } = await supabase.rpc('admin_directory');
  const admins = (adminData || []) as AdminRow[];

  return <LogsFilters entityType={entityType} adminId={adminId} entityTypes={ENTITY_TYPES} admins={admins} />;
}

async function LogsTable({ entityType, adminId, page }: { entityType?: string; adminId?: string; page: number }) {
  const from = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();

  let query = supabase
    .from('admin_audit_log')
    .select('id, action, entity_type, entity_id, details, created_at, profiles!admin_audit_log_admin_id_fkey(full_name, email)')
    .order('created_at', { ascending: false });
  if (entityType) query = query.eq('entity_type', entityType);
  if (adminId) query = query.eq('admin_id', adminId);

  const { data } = await query.range(from, from + PAGE_SIZE);

  const rows = (data || []) as unknown as LogRow[];
  const hasNext = rows.length > PAGE_SIZE;
  const logs = rows.slice(0, PAGE_SIZE);

  return (
    <>
      <div className={tableWrapClass}>
        {logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={entityType || adminId ? 'No actions match these filters' : 'No admin actions logged yet'}
            description={entityType || adminId ? 'Try a different entity type or admin.' : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableCellClass}>When</th>
                <th className={tableCellClass}>Admin</th>
                <th className={tableCellClass}>Action</th>
                <th className={tableCellClass}>What changed</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={tableRowClass} style={staggerDelay(i)}>
                  <td className={`${tableCellClass} text-kiranam-muted`}>
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </td>
                  <td className={`${tableCellClass} text-kiranam-ink`}>
                    {log.profiles?.full_name || log.profiles?.email || 'Unknown'}
                  </td>
                  <td className={`${tableCellClass} text-kiranam-muted`}>{log.entity_type}</td>
                  <td className={tableCellClass}>{describeLogEntry(log.action, log.details)}</td>
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
          if (entityType) params.set('entityType', entityType);
          if (adminId) params.set('adminId', adminId);
          params.set('page', String(p));
          return `/settings/logs?${params.toString()}`;
        }}
      />
    </>
  );
}
