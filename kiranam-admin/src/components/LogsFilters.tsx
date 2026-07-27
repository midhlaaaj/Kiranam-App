'use client';

import { useRouter } from 'next/navigation';
import { inputClass } from '@/lib/ui';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  campaigns: 'Campaigns',
  campaign_images: 'Campaign Images',
  events: 'Events',
  event_images: 'Event Images',
  volunteer_applications: 'Volunteer Applications',
  contributor_assignments: 'Contributor Assignments',
  notifications: 'Notifications',
  admin_invites: 'Admin Invites',
  profiles: 'Admin Access',
};

export function LogsFilters({
  entityType,
  adminId,
  entityTypes,
  admins,
}: {
  entityType?: string;
  adminId?: string;
  entityTypes: string[];
  admins: { id: string; full_name: string; email: string }[];
}) {
  const router = useRouter();

  function navigate(updates: { entityType?: string; adminId?: string }) {
    const params = new URLSearchParams();
    const nextEntityType = updates.entityType !== undefined ? updates.entityType : entityType;
    const nextAdminId = updates.adminId !== undefined ? updates.adminId : adminId;
    if (nextEntityType) params.set('entityType', nextEntityType);
    if (nextAdminId) params.set('adminId', nextAdminId);
    router.push(`/settings/logs?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={entityType || ''}
        onChange={(e) => navigate({ entityType: e.target.value })}
        className={`${inputClass} w-auto`}
      >
        <option value="">All entity types</option>
        {entityTypes.map((t) => (
          <option key={t} value={t}>
            {ENTITY_TYPE_LABELS[t] || t}
          </option>
        ))}
      </select>

      <select
        value={adminId || ''}
        onChange={(e) => navigate({ adminId: e.target.value })}
        className={`${inputClass} w-auto`}
      >
        <option value="">All admins</option>
        {admins.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name || a.email}
          </option>
        ))}
      </select>
    </div>
  );
}
