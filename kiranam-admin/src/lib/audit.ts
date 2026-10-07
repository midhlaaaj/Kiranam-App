import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** Writes an admin audit-log row. Put the record's human name in
 * `details.label` (and a related person in `details.otherLabel`) at log time —
 * the log has to stay readable after the record is renamed or deleted. */
export async function logAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  const supabase = await createClient();
  await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    details: details ?? null,
  });
}

const LABEL_COLUMN = { profiles: 'full_name', campaigns: 'title', events: 'title' } as const;

/** Display name of a record for `details.label` — call *before* deleting it. */
export async function lookupLabel(table: keyof typeof LABEL_COLUMN, id: string | null | undefined) {
  if (!id) return null;
  const column = LABEL_COLUMN[table];
  const supabase = await createClient();
  const { data } = await supabase.from(table).select(column).eq('id', id).maybeSingle();
  const value = (data as Record<string, unknown> | null)?.[column];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
