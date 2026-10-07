'use client';

import { useState } from 'react';
import { AddNewPanel } from '@/components/AddNewPanel';
import { RegisterContributorForm } from './RegisterContributorForm';
import { ContributorQuickViewModal } from './ContributorQuickViewModal';
import { VolunteerQuickViewModal } from '../volunteers/VolunteerQuickViewModal';
import type { PhoneDuplicateMatch } from '@/lib/phoneDuplicateActions';

/** Wraps AddNewPanel + RegisterContributorForm with an externally-controlled
 * open state, so a duplicate-phone match's "Edit profile" action can close
 * this registration panel and open the matched contributor/volunteer's quick
 * view in its place — the quick view is rendered here, as a sibling of
 * AddNewPanel, so it survives that close instead of unmounting with it. */
export function ContributorsRegisterPanel({
  filters,
  search,
  mobileToolbar,
}: {
  filters?: React.ReactNode;
  search?: React.ReactNode;
  mobileToolbar?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<PhoneDuplicateMatch | null>(null);

  return (
    <>
      <AddNewPanel
        title="Contributors"
        label="Register contributor"
        modal
        filters={filters}
        search={search}
        mobileToolbar={mobileToolbar}
        open={open}
        onOpenChange={setOpen}
      >
        <RegisterContributorForm
          bare
          onDone={() => setOpen(false)}
          onEditExisting={(match) => {
            setOpen(false);
            setEditMatch(match);
          }}
        />
      </AddNewPanel>

      {editMatch?.role === 'contributor' && (
        <ContributorQuickViewModal contributorId={editMatch.id} onClose={() => setEditMatch(null)} initialEditing />
      )}
      {editMatch?.role === 'volunteer' && (
        <VolunteerQuickViewModal volunteerId={editMatch.id} onClose={() => setEditMatch(null)} initialEditing />
      )}
    </>
  );
}
