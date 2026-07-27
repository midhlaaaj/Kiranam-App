'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';

export async function assignContributor(volunteerId: string, formData: FormData) {
  const admin = await verifyAdmin();
  const contributorId = String(formData.get('contributorId') || '');
  if (!contributorId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from('contributor_assignments')
    .insert({ volunteer_id: volunteerId, contributor_id: contributorId });
  if (error && !error.message.includes('duplicate')) throw new Error(error.message);

  await logAction(admin.id, 'assign_contributor', 'contributor_assignments', volunteerId, { contributorId });
  revalidatePath(`/volunteers/${volunteerId}`);
}

export async function unassignContributor(volunteerId: string, contributorId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('contributor_assignments')
    .delete()
    .eq('volunteer_id', volunteerId)
    .eq('contributor_id', contributorId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'unassign_contributor', 'contributor_assignments', volunteerId, { contributorId });
  revalidatePath(`/volunteers/${volunteerId}`);
}

export async function approveApplication(applicationId: string, profileId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const { error: appError } = await supabase
    .from('volunteer_applications')
    .update({ status: 'approved', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (appError) throw new Error(appError.message);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'volunteer' })
    .eq('id', profileId);
  if (profileError) throw new Error(profileError.message);

  await logAction(admin.id, 'approve_volunteer_application', 'volunteer_applications', applicationId, { profileId });
  revalidatePath(`/volunteers/${profileId}`);
  revalidatePath('/volunteers');
}

export async function rejectApplication(applicationId: string, profileId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('volunteer_applications')
    .update({ status: 'rejected', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'reject_volunteer_application', 'volunteer_applications', applicationId, { profileId });
  revalidatePath(`/volunteers/${profileId}`);
  revalidatePath('/volunteers');
}
