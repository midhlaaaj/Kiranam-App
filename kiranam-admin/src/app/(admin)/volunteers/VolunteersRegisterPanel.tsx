'use client';

import { useState } from 'react';
import { AddNewPanel } from '@/components/AddNewPanel';
import { RegisterVolunteerForm } from './RegisterVolunteerForm';
import { VolunteerQuickViewModal } from './VolunteerQuickViewModal';
import type { PhoneDuplicateMatch } from '@/lib/phoneDuplicateActions';

/** Wraps AddNewPanel + RegisterVolunteerForm with an externally-controlled
 * open state, so a duplicate-phone match's "Edit profile" action can close
 * this registration panel and open the matched volunteer's quick view in its
 * place — the quick view is rendered here, as a sibling of AddNewPanel, so
 * it survives that close instead of unmounting with it. (A contributor
 * match is handled inline via "Upgrade to volunteer" instead, so it needs
 * no modal here.) */
export function VolunteersRegisterPanel({
  filters,
  search,
}: {
  filters?: React.ReactNode;
  search?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<PhoneDuplicateMatch | null>(null);

  return (
    <>
      <AddNewPanel
        title="Volunteers"
        label="Register volunteer"
        description="For someone recruited offline who hasn't applied in the app yet."
        modal
        filters={filters}
        search={search}
        open={open}
        onOpenChange={setOpen}
      >
        <RegisterVolunteerForm
          onDone={() => setOpen(false)}
          onEditExisting={(match) => {
            setOpen(false);
            setEditMatch(match);
          }}
        />
      </AddNewPanel>

      {editMatch && (
        <VolunteerQuickViewModal volunteerId={editMatch.id} onClose={() => setEditMatch(null)} initialEditing />
      )}
    </>
  );
}
