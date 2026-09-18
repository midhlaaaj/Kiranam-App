'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { PersonCombobox } from '@/components/PersonCombobox';
import { assignKkNumber, assignVolunteer, getContributorQuickView, getVolunteersForAssignment, unassignVolunteer } from './actions';
import { buttonPrimary, buttonSecondary } from '@/lib/ui';

const fieldLabelClass = 'text-xs font-semibold text-kiranam-muted';

type QuickView = {
  id: string;
  full_name: string | null;
  phone: string | null;
  kk_number: string | null;
  volunteer: { id: string; full_name: string | null; phone: string | null } | null;
};

/** Compact view/edit popup for a single contributor — opened from a
 * Contributors table row, or from a duplicate-phone match surfaced while
 * registering a new contributor or volunteer. Editing here is deliberately
 * limited to KK number + volunteer assignment; anything else (contributions,
 * commitment, etc.) still lives on the full detail page, linked from here. */
export function ContributorQuickViewModal({
  contributorId,
  onClose,
  initialEditing = false,
}: {
  contributorId: string | null;
  onClose: () => void;
  /** Opens straight into edit mode — used when this is reached from a
   * "user already exists, edit their profile" prompt rather than a plain
   * table-row click. */
  initialEditing?: boolean;
}) {
  const [data, setData] = useState<QuickView | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(initialEditing);
  const [saving, setSaving] = useState(false);
  const [volunteers, setVolunteers] = useState<{ id: string; full_name: string | null; phone: string | null }[]>([]);
  const [kkNumber, setKkNumber] = useState('');
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);

  async function load(id: string) {
    setLoading(true);
    setEditing(initialEditing);
    try {
      const [view, allVolunteers] = await Promise.all([getContributorQuickView(id), getVolunteersForAssignment()]);
      setData(view);
      setVolunteers(allVolunteers);
      setKkNumber(view.kk_number || '');
      setSelectedVolunteerId(view.volunteer?.id ?? null);
    } catch {
      toast.error('Could not load this contributor.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // react-hooks/set-state-in-effect: this is the standard "loading flag
    // before an async fetch" pattern, not a correctness bug — same call this
    // codebase already made for the whatsapp/** rule override in eslint.config.mjs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (contributorId) load(contributorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialEditing is a mount-time prop, not a reactive dependency to re-fetch on
  }, [contributorId]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const trimmedKk = kkNumber.trim().toUpperCase();
      if (trimmedKk && trimmedKk !== (data.kk_number || '')) {
        await assignKkNumber(data.id, trimmedKk);
      }

      if (selectedVolunteerId !== (data.volunteer?.id ?? null)) {
        if (selectedVolunteerId) {
          const fd = new FormData();
          fd.set('volunteerId', selectedVolunteerId);
          await assignVolunteer(data.id, fd);
        } else if (data.volunteer) {
          await unassignVolunteer(data.id, data.volunteer.id);
        }
      }

      toast.success('Contributor updated.');
      const refreshed = await getContributorQuickView(data.id);
      setData(refreshed);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!contributorId} onClose={onClose} title="Contributor">
      {loading || !data ? (
        <div className="py-6 text-center text-sm text-kiranam-muted">Loading…</div>
      ) : editing ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-kiranam-ink">{data.full_name || 'Unnamed'}</h3>
            <p className="text-sm text-kiranam-muted">{data.phone}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="qv_kk_number" className={fieldLabelClass}>
              KK number
            </label>
            <input
              id="qv_kk_number"
              value={kkNumber}
              onChange={(e) => setKkNumber(e.target.value)}
              placeholder="e.g. KK1"
              className="w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={fieldLabelClass}>Volunteer</label>
            <PersonCombobox
              key={data.id}
              people={volunteers}
              name="volunteerId"
              initial={data.volunteer}
              onSelect={(p) => setSelectedVolunteerId(p?.id ?? null)}
              placeholder="Search volunteers by name or phone…"
              emptyLabel="No volunteers match."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className={buttonSecondary} disabled={saving}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className={buttonPrimary} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-kiranam-ink">{data.full_name || 'Unnamed'}</h3>
              <p className="text-sm text-kiranam-muted">{data.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit KK number and volunteer"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className={fieldLabelClass}>KK number</p>
              <p className="mt-1 text-kiranam-ink">{data.kk_number || '—'}</p>
            </div>
            <div>
              <p className={fieldLabelClass}>Volunteer</p>
              <p className="mt-1 text-kiranam-ink">{data.volunteer?.full_name || 'Not assigned'}</p>
            </div>
          </div>

          <Link href={`/contributors/${data.id}`} className="text-sm font-medium text-kiranam-primary hover:underline">
            View full details →
          </Link>
        </div>
      )}
    </Modal>
  );
}
