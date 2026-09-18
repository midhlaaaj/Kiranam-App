'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { getVolunteerQuickView, updateVolunteerKkNumber } from './actions';
import { buttonPrimary, buttonSecondary } from '@/lib/ui';

const fieldLabelClass = 'text-xs font-semibold text-kiranam-muted';

type QuickView = {
  id: string;
  full_name: string | null;
  phone: string | null;
  kk_number: string | null;
  assignedCount: number;
};

/** Compact view/edit popup for a single volunteer — opened from a Volunteers
 * table row, or from a duplicate-phone match surfaced while registering.
 * Editing here is deliberately limited to KK number; contributor
 * assignment and everything else still lives on the full detail page,
 * linked from here. */
export function VolunteerQuickViewModal({
  volunteerId,
  onClose,
  initialEditing = false,
}: {
  volunteerId: string | null;
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
  const [kkNumber, setKkNumber] = useState('');

  async function load(id: string) {
    setLoading(true);
    setEditing(initialEditing);
    try {
      const view = await getVolunteerQuickView(id);
      setData(view);
      setKkNumber(view.kk_number || '');
    } catch {
      toast.error('Could not load this volunteer.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // react-hooks/set-state-in-effect: this is the standard "loading flag
    // before an async fetch" pattern, not a correctness bug — same call this
    // codebase already made for the whatsapp/** rule override in eslint.config.mjs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (volunteerId) load(volunteerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialEditing is a mount-time prop, not a reactive dependency to re-fetch on
  }, [volunteerId]);

  async function handleSave() {
    if (!data) return;
    const trimmedKk = kkNumber.trim().toUpperCase();
    if (!trimmedKk || trimmedKk === (data.kk_number || '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateVolunteerKkNumber(data.id, trimmedKk);
      toast.success('Volunteer updated.');
      setData({ ...data, kk_number: trimmedKk });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!volunteerId} onClose={onClose} title="Volunteer">
      {loading || !data ? (
        <div className="py-6 text-center text-sm text-kiranam-muted">Loading…</div>
      ) : editing ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-kiranam-ink">{data.full_name || 'Unnamed'}</h3>
            <p className="text-sm text-kiranam-muted">{data.phone}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="qv_v_kk_number" className={fieldLabelClass}>
              KK number
            </label>
            <input
              id="qv_v_kk_number"
              value={kkNumber}
              onChange={(e) => setKkNumber(e.target.value)}
              placeholder="e.g. KK1"
              className="w-full rounded-lg border border-kiranam-border-strong bg-kiranam-surface px-3.5 py-2.5 text-sm text-kiranam-ink placeholder:text-kiranam-muted transition duration-150 focus:border-kiranam-primary focus:outline-none"
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
              aria-label="Edit KK number"
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
              <p className={fieldLabelClass}>Assigned contributors</p>
              <p className="mt-1 text-kiranam-ink">{data.assignedCount}</p>
            </div>
          </div>

          <Link href={`/volunteers/${data.id}`} className="text-sm font-medium text-kiranam-primary hover:underline">
            View full details →
          </Link>
        </div>
      )}
    </Modal>
  );
}
