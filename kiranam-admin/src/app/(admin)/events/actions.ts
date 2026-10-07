'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction, lookupLabel } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errors';
import { uploadPublicImage } from '@/lib/storage';
import { applyMediaFromForm, EVENT_MEDIA } from '@/lib/mediaSave';

export interface CreateEventState {
  message?: string;
  error?: string;
}

export async function createEvent(
  _prevState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const title = String(formData.get('title') || '').trim();
  const location = String(formData.get('location') || '').trim();
  if (!title) return { error: 'Title is required.' };
  if (!location) return { error: 'Location is required.' };

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title,
      description: String(formData.get('description') || ''),
      event_date: String(formData.get('event_date') || '') || null,
      time_label: String(formData.get('time_label') || ''),
      location,
      is_past: false,
    })
    .select('id')
    .single();
  if (error) return { error: friendlyErrorMessage(error.message) };

  // Photos: the unified MediaManager list (first = cover). Fall back to the
  // legacy single cover field if a caller still posts it.
  if (!(await applyMediaFromForm(EVENT_MEDIA, event.id, formData))) {
    const cover = formData.get('cover');
    if (cover instanceof File && cover.size > 0) {
      const url = await uploadPublicImage('event-images', event.id, cover);
      await supabase.from('events').update({ cover_image_url: url }).eq('id', event.id);
    }
  }

  await logAction(admin.id, 'create_event', 'events', event.id, { label: title });
  revalidatePath('/events');
  return { message: `"${title}" created.` };
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

  if (!(await applyMediaFromForm(EVENT_MEDIA, id, formData))) {
    const cover = formData.get('cover');
    if (cover instanceof File && cover.size > 0) {
      const url = await uploadPublicImage('event-images', id, cover);
      await supabase.from('events').update({ cover_image_url: url }).eq('id', id);
    }
  }

  await logAction(admin.id, 'update_event', 'events', id, { label: String(formData.get('title') || '') });
  revalidatePath('/events');
  redirect(`/events/${id}/edit`);
}

export async function deleteEventImage(imageId: string, eventId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('event_images').delete().eq('id', imageId);
  if (error) throw new Error(friendlyErrorMessage(error.message));

  await logAction(admin.id, 'delete_event_image', 'event_images', imageId, {
    eventId,
    label: await lookupLabel('events', eventId),
  });
  revalidatePath(`/events/${eventId}/edit`);
}

export async function deleteEvent(id: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const label = await lookupLabel('events', id);
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new Error(friendlyErrorMessage(error.message));

  await logAction(admin.id, 'delete_event', 'events', id, { label });
  revalidatePath('/events');
}
