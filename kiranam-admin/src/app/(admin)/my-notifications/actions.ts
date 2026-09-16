'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

export async function markNotificationRead(notificationId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('profile_id', admin.id);
  revalidatePath('/my-notifications');
  revalidatePath('/', 'layout');
}

export async function markAllNotificationsRead() {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', admin.id)
    .eq('is_read', false);
  revalidatePath('/my-notifications');
  revalidatePath('/', 'layout');
}

export async function clearAllNotifications() {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('notifications').delete().eq('profile_id', admin.id);
  if (error) throw new Error(error.message);
  revalidatePath('/my-notifications');
  revalidatePath('/', 'layout');
}
