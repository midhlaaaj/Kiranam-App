function humanizeAction(action: string) {
  const s = action.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

/** Turns a raw audit-log action + details payload into a short, plain-English
 * sentence — admins reading the log shouldn't need to parse JSON or UUIDs. */
export function describeLogEntry(action: string, details: Record<string, unknown> | null): string {
  const d = details || {};

  switch (action) {
    case 'assign_contributor':
      return 'Assigned a contributor to this volunteer.';
    case 'unassign_contributor':
      return 'Removed a contributor from this volunteer.';
    case 'approve_volunteer_application':
      return 'Approved a volunteer application.';
    case 'reject_volunteer_application':
      return 'Rejected a volunteer application.';
    case 'create_campaign':
      return 'Created a new campaign.';
    case 'update_campaign':
      return 'Updated the campaign details.';
    case 'delete_campaign_image':
      return 'Removed an image from a campaign.';
    case 'delete_campaign':
      return 'Deleted a campaign.';
    case 'create_event':
      return 'Created a new event.';
    case 'update_event':
      return 'Updated the event details.';
    case 'delete_event_image':
      return 'Removed an image from an event.';
    case 'delete_event':
      return 'Deleted an event.';
    case 'send_announcement': {
      const title = typeof d.title === 'string' ? d.title : 'a notification';
      const count = typeof d.count === 'number' ? d.count : undefined;
      const audience = typeof d.audience === 'string' ? d.audience : 'recipient';
      return count !== undefined
        ? `Sent "${title}" to ${count} ${audience}${count === 1 ? '' : 's'}.`
        : `Sent "${title}" to ${audience}s.`;
    }
    case 'invite_admin': {
      const email = typeof d.email === 'string' ? d.email : 'a new admin';
      return `Invited ${email} as an admin.`;
    }
    case 'revoke_invite':
      return 'Revoked an admin invite.';
    case 'revoke_admin':
      return "Revoked an admin's access.";
    default:
      return humanizeAction(action);
  }
}
