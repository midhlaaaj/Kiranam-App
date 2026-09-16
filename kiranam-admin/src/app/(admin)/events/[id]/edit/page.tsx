import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deleteEventImage, updateEvent } from '../../actions';
import { buttonPrimary, cardClass, inputClass, linkDanger } from '@/lib/ui';
import { Form } from '@/components/Form';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { FieldGroup, Field } from '@/components/FormField';
import { ImageCropField, COVER_CROP, GALLERY_CROP } from '@/components/ImageCropField';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single();
  if (!event) notFound();

  const { data: images } = await supabase
    .from('event_images')
    .select('id, image_url')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  return (
    <div>
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-kiranam-muted transition hover:text-kiranam-ink hover:underline">
        <ArrowLeft size={15} /> Back to Events
      </Link>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-kiranam-ink">Edit Event</h1>

      <Form action={updateEvent.bind(null, id)} className={`mt-6 max-w-xl ${cardClass} p-5`}>
        <FieldGroup label="Event details">
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" defaultValue={event.title} required className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea id="description" name="description" rows={3} defaultValue={event.description} className={inputClass} />
          </Field>
        </FieldGroup>

        <FieldGroup label="Schedule & location">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" htmlFor="event_date">
              <input id="event_date" name="event_date" type="date" defaultValue={event.event_date ?? ''} className={inputClass} />
            </Field>
            <Field label="Time" htmlFor="time_label" hint='Free text, e.g. "6:00 PM onwards"'>
              <input id="time_label" name="time_label" defaultValue={event.time_label ?? ''} className={inputClass} />
            </Field>
          </div>
          <Field label="Location" htmlFor="location">
            <input id="location" name="location" defaultValue={event.location ?? ''} className={inputClass} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-kiranam-ink select-none">
            <input
              type="checkbox"
              name="is_past"
              defaultChecked={event.is_past}
              className="size-4 cursor-pointer accent-kiranam-primary"
            />
            Mark as past event
          </label>
        </FieldGroup>

        <FieldGroup label="Media" last>
          <Field label="Cover image">
            {event.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.cover_image_url} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
            )}
            <ImageCropField name="cover" crop={COVER_CROP} />
          </Field>
          <Field label="Add gallery images">
            <ImageCropField name="gallery" crop={GALLERY_CROP} multiple />
          </Field>
        </FieldGroup>

        <button type="submit" className={`${buttonPrimary} mt-5 w-full`}>
          Save Changes
        </button>
      </Form>

      {(images || []).length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold tracking-tight text-kiranam-ink">Gallery</h2>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
            {(images || []).map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" className="h-24 w-full rounded-lg object-cover" />
                <ConfirmSubmitButton
                  action={deleteEventImage.bind(null, img.id, id)}
                  label="Delete"
                  title="Delete this image?"
                  description="This gallery image will be permanently removed from the event."
                  confirmLabel="Delete"
                  successMessage="Image deleted."
                  pendingMessage="Deleting image…"
                  className={`mt-1 ${linkDanger}`}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
