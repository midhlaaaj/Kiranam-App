'use client';

import { useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { VolunteerQuickViewModal } from './VolunteerQuickViewModal';
import { staggerDelay, tableCellClass, tableHeadRowClass, tableRowClass, tableWrapClass } from '@/lib/ui';

interface VolunteerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  referralCode: string;
  assignedCount: number;
}

/** Renders the approved-volunteers table and owns the single
 * VolunteerQuickViewModal instance shared across rows — a row opens it
 * instead of navigating away, so KK number can be checked or fixed without
 * leaving the list. */
export function VolunteersTableClient({ volunteers, emptyTitle, emptyDescription }: {
  volunteers: VolunteerRow[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={tableWrapClass}>
      {volunteers.length === 0 ? (
        <EmptyState icon={HeartHandshake} title={emptyTitle} description={emptyDescription} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Name</th>
              <th className={tableCellClass}>Phone</th>
              <th className={tableCellClass}>Referral Code</th>
              <th className={tableCellClass}>Assigned Contributors</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v, i) => (
              <tr key={v.id} className={tableRowClass} style={staggerDelay(i)}>
                <td className={tableCellClass}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className="cursor-pointer font-semibold text-kiranam-ink hover:text-kiranam-primary hover:underline"
                  >
                    {v.full_name || 'Unnamed'}
                  </button>
                </td>
                <td className={`${tableCellClass} text-kiranam-muted`}>{v.phone}</td>
                <td className={`${tableCellClass} font-mono text-kiranam-muted`}>{v.referralCode}</td>
                <td className={`${tableCellClass} text-kiranam-muted tabular-nums`}>{v.assignedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <VolunteerQuickViewModal volunteerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
