import { formatMoney } from '@/lib/ui';

// Single source of truth for how audit-log actions are grouped and worded.
// The Activity log's "Area" filter is built from AUDIT_AREAS, so a new action
// only needs an entry here to become filterable and readable.

export type AuditArea = 'people' | 'money' | 'campaigns' | 'communications' | 'access';

export const AUDIT_AREAS: { value: AuditArea; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'money', label: 'Money' },
  { value: 'campaigns', label: 'Campaigns & events' },
  { value: 'communications', label: 'Announcements' },
  { value: 'access', label: 'Admin access & settings' },
];

const ACTION_AREA: Record<string, AuditArea> = {
  register_contributor: 'people',
  register_volunteer: 'people',
  assign_kk_number: 'people',
  upgrade_contributor_to_volunteer: 'people',
  demote_volunteer_to_contributor: 'people',
  assign_contributor: 'people',
  unassign_contributor: 'people',
  approve_volunteer_application: 'people',
  reject_volunteer_application: 'people',
  add_offline_payment: 'money',
  create_campaign: 'campaigns',
  update_campaign: 'campaigns',
  delete_campaign: 'campaigns',
  archive_campaign: 'campaigns',
  unarchive_campaign: 'campaigns',
  mark_campaign_fully_raised: 'campaigns',
  delete_campaign_image: 'campaigns',
  create_event: 'campaigns',
  update_event: 'campaigns',
  delete_event: 'campaigns',
  delete_event_image: 'campaigns',
  send_announcement: 'communications',
  invite_admin: 'access',
  revoke_invite: 'access',
  revoke_admin: 'access',
  set_auto_assign_kk_number: 'access',
};

export function actionsInArea(area: string): string[] {
  return Object.entries(ACTION_AREA)
    .filter(([, a]) => a === area)
    .map(([action]) => action);
}

export function areaOf(action: string): AuditArea | null {
  return ACTION_AREA[action] ?? null;
}

export function areaLabel(area: AuditArea | null) {
  return AUDIT_AREAS.find((a) => a.value === area)?.label ?? 'Other';
}

/** A sentence made of plain text and record references; references with an
 * `href` render as links (records that may since have been deleted don't). */
export type LogPart = string | { text: string; href?: string };

export interface LogEntryInput {
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
}

/** Names for records referenced by IDs in older log rows that predate
 * `details.label` — resolved in one batch by the log page. */
export interface ResolvedNames {
  people: Map<string, string>;
  campaigns: Map<string, string>;
  events: Map<string, string>;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function humanizeAction(action: string) {
  const s = action.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function describeLogEntry(entry: LogEntryInput, names?: ResolvedNames): LogPart[] {
  const d = entry.details || {};
  const id = entry.entity_id;

  const person = (pid: unknown, label: unknown, fallback: string, base = '/contributors'): LogPart => {
    const pidStr = str(pid);
    const name = str(label) ?? (pidStr ? names?.people.get(pidStr) : null);
    return name ? { text: name, href: pidStr ? `${base}/${pidStr}` : undefined } : fallback;
  };
  const campaign = (cid: string | null, label: unknown, deleted = false): LogPart => {
    const name = str(label) ?? (cid ? names?.campaigns.get(cid) : null);
    if (!name) return 'a campaign';
    return { text: name, href: !deleted && cid ? `/campaigns/${cid}/edit` : undefined };
  };
  const event = (eid: string | null, label: unknown, deleted = false): LogPart => {
    const name = str(label) ?? (eid ? names?.events.get(eid) : null);
    if (!name) return 'an event';
    return { text: name, href: !deleted && eid ? `/events/${eid}/edit` : undefined };
  };

  // Older rows predate details.contributorId/volunteerId — whichever one is
  // missing is the row's own entity_id.
  switch (entry.action) {
    case 'register_contributor':
      return ['Registered contributor ', person(id, d.label ?? d.fullName, 'a new contributor'), kk(d)];
    case 'register_volunteer':
      return ['Registered volunteer ', person(id, d.label ?? d.fullName, 'a new volunteer', '/volunteers'), kk(d)];
    case 'assign_kk_number':
      return ['Gave ', person(id, d.label, 'someone'), ` KK number ${str(d.kkNumber) ?? ''}`.trimEnd()];
    case 'upgrade_contributor_to_volunteer':
      return ['Made ', person(id, d.label, 'a contributor', '/volunteers'), ' a volunteer'];
    case 'demote_volunteer_to_contributor':
      return ['Changed ', person(id, d.label, 'a volunteer'), ' back to a contributor'];
    case 'assign_contributor':
      return [
        'Assigned ',
        person(d.contributorId ?? id, d.label, 'a contributor'),
        ' to volunteer ',
        person(d.volunteerId ?? id, d.otherLabel, 'a volunteer', '/volunteers'),
      ];
    case 'unassign_contributor':
      return [
        'Removed ',
        person(d.contributorId ?? id, d.label, 'a contributor'),
        ' from volunteer ',
        person(d.volunteerId ?? id, d.otherLabel, 'a volunteer', '/volunteers'),
      ];
    case 'approve_volunteer_application':
      return ['Approved ', person(d.profileId, d.label, 'a volunteer application', '/volunteers'), '’s volunteer application'];
    case 'reject_volunteer_application':
      return ['Rejected ', person(d.profileId, d.label, 'a volunteer application', '/volunteers'), '’s volunteer application'];
    case 'add_offline_payment': {
      const amount = typeof d.amount === 'number' ? formatMoney(d.amount) : 'an offline payment';
      const parts: LogPart[] = [`Recorded ${amount} offline payment from `, person(id, d.label, 'a contributor')];
      if (str(d.campaignTitle)) parts.push(' for ', campaign(str(d.campaignId), d.campaignTitle));
      return parts;
    }
    case 'create_campaign':
      return ['Created campaign ', campaign(id, d.label)];
    case 'update_campaign':
      return ['Edited campaign ', campaign(id, d.label)];
    case 'delete_campaign':
      return ['Deleted campaign ', campaign(id, d.label, true)];
    case 'archive_campaign':
      return ['Archived campaign ', campaign(id, d.label)];
    case 'unarchive_campaign':
      return ['Restored campaign ', campaign(id, d.label), ' from the archive'];
    case 'mark_campaign_fully_raised':
      return ['Marked campaign ', campaign(id, d.label), ' as fully raised'];
    case 'delete_campaign_image':
      return ['Removed a photo from campaign ', campaign(str(d.campaignId), d.label)];
    case 'create_event':
      return ['Created event ', event(id, d.label)];
    case 'update_event':
      return ['Edited event ', event(id, d.label)];
    case 'delete_event':
      return ['Deleted event ', event(id, d.label, true)];
    case 'delete_event_image':
      return ['Removed a photo from event ', event(str(d.eventId), d.label)];
    case 'send_announcement': {
      const title = str(d.title);
      const count = typeof d.count === 'number' ? d.count : undefined;
      const audience = str(d.audience) ?? 'recipient';
      const plural = (n: number) => (audience === 'all' ? (n === 1 ? 'person' : 'people') : `${audience}${n === 1 ? '' : 's'}`);
      const who = count !== undefined ? `${count} ${plural(count)}` : audience === 'all' ? 'everyone' : `${audience}s`;
      return title ? ['Sent announcement ', { text: `“${title}”` }, ` to ${who}`] : [`Sent an announcement to ${who}`];
    }
    case 'invite_admin':
      return ['Invited ', { text: str(d.label ?? d.email) ?? 'someone' }, ' to be an admin'];
    case 'revoke_invite':
      return str(d.label) ? ['Revoked the admin invite for ', { text: str(d.label)! }] : ['Revoked an admin invite'];
    case 'revoke_admin':
      return ['Removed admin access for ', person(id, d.label, 'an admin')];
    case 'set_auto_assign_kk_number':
      return [`Turned ${d.enabled ? 'on' : 'off'} automatic KK numbers for new contributors`];
    default:
      return [humanizeAction(entry.action)];
  }
}

function kk(d: Record<string, unknown>): string {
  const n = str(d.kkNumber);
  return n ? ` (${n})` : '';
}
