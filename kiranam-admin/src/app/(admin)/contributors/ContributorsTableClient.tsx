'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ContributorQuickViewModal } from './ContributorQuickViewModal';
import type { ContributorStatus } from '@/lib/volunteerStats';
import {
  badgeClass,
  formatMoney,
  staggerDelay,
  tableCellClass,
  tableCellNumClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

const STATUS_LABEL: Record<ContributorStatus, string> = {
  active: 'Active',
  due: 'Due',
  overdue: 'Overdue',
  inactive: 'Inactive',
};

const STATUS_TONE: Record<ContributorStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  due: 'warning',
  overdue: 'danger',
  inactive: 'neutral',
};

interface ContributorRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  kk_number: string | null;
  monthlyAmount: number | null;
  status: ContributorStatus;
}

/** Renders the Contributors table and owns the single ContributorQuickViewModal
 * instance shared across rows — a row opens it instead of navigating away, so
 * KK number / volunteer can be checked or fixed without leaving the list. */
export function ContributorsTableClient({ contributors, emptyTitle, emptyDescription }: {
  contributors: ContributorRow[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={tableWrapClass}>
      {contributors.length === 0 ? (
        <EmptyState icon={Users} title={emptyTitle} description={emptyDescription} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Name</th>
              <th className={tableCellClass}>KK Number</th>
              <th className={tableCellClass}>Phone</th>
              <th className={tableCellClass}>Monthly Amount</th>
              <th className={tableCellClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((c, i) => (
              <tr key={c.id} className={tableRowClass} style={staggerDelay(i)}>
                <td className={tableCellClass}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="cursor-pointer font-semibold text-kiranam-ink hover:text-kiranam-primary hover:underline"
                  >
                    {c.full_name || 'Unnamed'}
                  </button>
                </td>
                <td className={`${tableCellClass} text-kiranam-muted`}>{c.kk_number || '—'}</td>
                <td className={`${tableCellClass} text-kiranam-muted`}>{c.phone}</td>
                <td className={`${tableCellNumClass} text-kiranam-muted`}>
                  {c.monthlyAmount ? formatMoney(Number(c.monthlyAmount)) : '—'}
                </td>
                <td className={tableCellClass}>
                  <span className={badgeClass(STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ContributorQuickViewModal contributorId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
