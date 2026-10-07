import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { actionsInArea, AUDIT_AREAS, type LogEntryInput, type ResolvedNames } from '@/lib/auditDescriptions';
import { isIsoDay, istRangeBounds } from '@/lib/format';
import { searchTerm } from '@/lib/search';

export interface AuditLogFilters {
  q?: string;
  area?: string;
  adminId?: string;
  from?: string;
  to?: string;
}

export interface AuditLogRow extends LogEntryInput {
  id: string;
  admin_id: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

/** Normalizes raw search params into filters the query trusts. */
export function parseAuditFilters(sp: Record<string, string | undefined>): AuditLogFilters {
  const area = AUDIT_AREAS.some((a) => a.value === sp.area) ? sp.area : undefined;
  const hasRange = isIsoDay(sp.from) && isIsoDay(sp.to) && sp.from! <= sp.to!;
  return {
    q: sp.q?.trim() || undefined,
    area,
    adminId: sp.adminId || undefined,
    from: hasRange ? sp.from : undefined,
    to: hasRange ? sp.to : undefined,
  };
}

export async function queryAuditLog(filters: AuditLogFilters, range?: { from: number; to: number }) {
  const supabase = await createClient();
  let query = supabase
    .from('admin_audit_log')
    .select(
      'id, admin_id, action, entity_type, entity_id, details, created_at, profiles!admin_audit_log_admin_id_fkey(full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (filters.area) query = query.in('action', actionsInArea(filters.area));
  if (filters.adminId) query = query.eq('admin_id', filters.adminId);
  if (filters.from && filters.to) {
    const { gte, lte } = istRangeBounds(filters.from, filters.to);
    query = query.gte('created_at', gte).lte('created_at', lte);
  }
  if (filters.q) {
    const term = searchTerm(filters.q);
    if (term) {
      const like = `*${term}*`;
      const actionLike = `*${term.replace(/ /g, '_')}*`;
      query = query.or(
        [
          `details->>label.ilike.${like}`,
          `details->>otherLabel.ilike.${like}`,
          `details->>title.ilike.${like}`,
          `details->>email.ilike.${like}`,
          `details->>fullName.ilike.${like}`,
          `details->>campaignTitle.ilike.${like}`,
          `details->>kkNumber.ilike.${like}`,
          `action.ilike.${actionLike}`,
        ].join(',')
      );
    }
  }
  if (range) query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  return { rows: (data || []) as unknown as AuditLogRow[], count: count ?? 0, error };
}

/** Batch-resolves names for rows written before `details.label` existed. */
export async function resolveLogNames(rows: AuditLogRow[]): Promise<ResolvedNames> {
  const people = new Set<string>();
  const campaigns = new Set<string>();
  const events = new Set<string>();

  for (const r of rows) {
    const d = r.details || {};
    if (typeof d.label === 'string' && d.label) continue;
    const add = (set: Set<string>, v: unknown) => typeof v === 'string' && v && set.add(v);
    if (r.entity_type === 'profiles' || r.entity_type === 'contributions') add(people, r.entity_id);
    if (r.entity_type === 'contributor_assignments') {
      add(people, r.entity_id);
      add(people, d.contributorId);
      add(people, d.volunteerId);
    }
    add(people, d.profileId);
    if (r.entity_type === 'campaigns') add(campaigns, r.entity_id);
    add(campaigns, d.campaignId);
    if (r.entity_type === 'events') add(events, r.entity_id);
    add(events, d.eventId);
  }

  const supabase = await createClient();
  const [p, c, e] = await Promise.all([
    people.size ? supabase.from('profiles').select('id, full_name').in('id', [...people]) : null,
    campaigns.size ? supabase.from('campaigns').select('id, title').in('id', [...campaigns]) : null,
    events.size ? supabase.from('events').select('id, title').in('id', [...events]) : null,
  ]);

  return {
    people: new Map((p?.data || []).filter((x) => x.full_name).map((x) => [x.id, x.full_name as string])),
    campaigns: new Map((c?.data || []).map((x) => [x.id, x.title as string])),
    events: new Map((e?.data || []).map((x) => [x.id, x.title as string])),
  };
}

/** Current admins plus anyone who appears in the log but has since lost
 * access — so you can still filter to the person you just removed. */
export async function auditAdminOptions() {
  const supabase = await createClient();
  const [{ data: current }, { data: logAdmins }] = await Promise.all([
    supabase.rpc('admin_directory'),
    supabase.from('admin_audit_log').select('admin_id').not('admin_id', 'is', null).limit(2000),
  ]);
  const currentRows = (current || []) as { id: string; full_name: string | null; email: string | null }[];
  const currentIds = new Set(currentRows.map((a) => a.id));
  const formerIds = [...new Set((logAdmins || []).map((r) => r.admin_id as string))].filter((id) => !currentIds.has(id));

  let formerRows: { id: string; full_name: string | null; email: string | null }[] = [];
  if (formerIds.length) {
    const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', formerIds);
    formerRows = data || [];
  }

  const name = (a: { full_name: string | null; email: string | null }) => a.full_name || a.email || 'Unknown';
  return [
    ...currentRows.map((a) => ({ value: a.id, label: name(a), group: formerRows.length ? 'Current admins' : undefined })),
    ...formerRows.map((a) => ({ value: a.id, label: name(a), group: 'Former admins' })),
  ];
}
