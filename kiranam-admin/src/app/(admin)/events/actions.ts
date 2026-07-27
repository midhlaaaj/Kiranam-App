'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';
import { uploadPublicImage } from '@/lib/storage';

export async function createEvent(formData: FormData) {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      event_date: String(formData.get('event_date') || '') || null,
      time_label: String(formData.get('time_label') || ''),
      location: String(formData.get('location') || ''),
      is_past: false,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const cover = formData.get('cover');
  if (cover instanceof File && cover.size > 0) {
    const url = await uploadPublicImage('event-images', event.id, cover);
    await supabase.from('events').update({ cover_image_url: url }).eq('id', event.id);
  }

  await logAction(admin.id, 'create_event', 'events', event.id);
  revalidatePath('/events');
}

export async function updateEvent(id: string, formData: FormData) {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('events')
    .update({
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      event_date: String(formData.get('event_date') || '') || null,
      time_label: String(formData.get('time_label') || ''),
      location: String(formData.get('location') || ''),
      is_past: formData.get('is_past') === 'on',
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  const cover = formData.get('cover');
  if (cover instanceof File && cover.size > 0) {
    const url = await uploadPublicImage('event-images', id, cover);
    await supabase.from('events').update({ cover_image_url: url }).eq('id', id);
  }

  const galleryFiles = formData.getAll('gallery').filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of galleryFiles) {
    const url = await uploadPublicImage('event-images', id, file);
    await supabase.from('event_images').insert({ event_id: id, image_url: url });
  }

  await logAction(admin.id, 'update_event', 'events', id);
  revalidatePath('/events');
  redirect(`/events/${id}/edit`);
}

export async function deleteEventImage(imageId: string, eventId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('event_images').delete().eq('id', imageId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'delete_event_image', 'event_images', imageId, { eventId });
  revalidatePath(`/events/${eventId}/edit`);
}

export async function deleteEvent(id: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'delete_event', 'events', id);
  revalidatePath('/events');
}
