// Mirrors AppContext.tsx's deriveMemberStatus in kiranam-app so both apps
// classify a contributor's payment health the same way.
export type ContributorStatus = 'active' | 'due' | 'overdue' | 'inactive';

export function deriveContributorStatus(commitment?: {
  autopay_enabled: boolean;
  next_due_date: string | null;
} | null): ContributorStatus {
  if (!commitment || !commitment.autopay_enabled) return 'inactive';
  if (!commitment.next_due_date) return 'active';
  const diffDays = (new Date(commitment.next_due_date).getTime() - Date.now()) / 86400000;
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due';
  return 'active';
}
