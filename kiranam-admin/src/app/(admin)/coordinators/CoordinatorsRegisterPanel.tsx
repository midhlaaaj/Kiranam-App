'use client';

import { useState } from 'react';
import { AddNewPanel } from '@/components/AddNewPanel';
import { RegisterCoordinatorForm } from './RegisterCoordinatorForm';
import { CoordinatorQuickViewModal } from './CoordinatorQuickViewModal';
import type { PhoneDuplicateMatch } from '@/lib/phoneDuplicateActions';

/** Wraps AddNewPanel + RegisterCoordinatorForm with an externally-controlled
 * open state, so a duplicate-phone match's "Edit profile" action can close
 * this registration panel and open the matched coordinator's quick view in its
 * place — the quick view is rendered here, as a sibling of AddNewPanel, so
 * it survives that close instead of unmounting with it. (A contributor
 * match is handled inline via "Upgrade to coordinator" instead, so it needs
 * no modal here.) */
export function CoordinatorsRegisterPanel({
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
        title="Coordinators"
        label="Register coordinator"
        modal
        filters={filters}
        search={search}
        open={open}
        onOpenChange={setOpen}
      >
        <RegisterCoordinatorForm
          bare
          onDone={() => setOpen(false)}
          onEditExisting={(match) => {
            setOpen(false);
            setEditMatch(match);
          }}
        />
      </AddNewPanel>

      {editMatch && (
        <CoordinatorQuickViewModal coordinatorId={editMatch.id} onClose={() => setEditMatch(null)} initialEditing />
      )}
    </>
  );
}
