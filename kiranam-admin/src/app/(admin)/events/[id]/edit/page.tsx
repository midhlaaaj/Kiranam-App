import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateEvent } from '../../actions';
import { badgeClass, cardClass, inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { Form } from '@/components/Form';
import { SubmitButton } from '@/components/SubmitButton';
import { EditCard, EditLayout } from '@/components/EditLayout';
import { Field } from '@/components/FormField';
import { MediaManager } from '@/components/MediaManager';
import { formatDate } from '@/lib/format';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single();
  if (!event) notFound();

  const { data: images } = await supabase
    .from('event_images')
    .select('id, image_url')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  // Cover first, then the gallery in order — the one list MediaManager edits.
  const mediaUrls = [event.cover_image_url, ...(images || []).map((i) => i.image_url)].filter((u): u is string => !!u);

  return (
    <Form action={updateEvent.bind(null, id)}>
      {/* Past/upcoming follows the date automatically. Only an event with no
          date keeps whatever it was last set to. */}
      {event.is_past && !event.event_date && <input type="hidden" name="is_past" value="on" />}
      <EditLayout
        backHref="/events"
        backLabel="All events"
        title={event.title}
        badge={<span className={badgeClass(event.is_past ? 'neutral' : 'success')}>{event.is_past ? 'Past' : 'Upcoming'}</span>}
        main={
          <>
            <EditCard title="Details">
              <Field label="Title" htmlFor="title">
                <input id="title" name="title" defaultValue={event.title} required className={inputClass} />
              </Field>
              <Field label="Description" htmlFor="description" hint="Shown to donors in the app.">
                <textarea id="description" name="description" rows={5} defaultValue={event.description} className={cn(inputClass, 'resize-y')} />
              </Field>
            </EditCard>

            <EditCard title="When & where">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date" htmlFor="event_date">
                  <input id="event_date" name="event_date" type="date" required defaultValue={event.event_date ?? ''} className={inputClass} />
                </Field>
                <Field label="Time" htmlFor="time_label" optional hint="Free text, e.g. “6:00 PM onwards”.">
                  <input id="time_label" name="time_label" defaultValue={event.time_label ?? ''} className={inputClass} />
                </Field>
              </div>
              <Field label="Location" htmlFor="location">
                <input id="location" name="location" required defaultValue={event.location ?? ''} className={inputClass} />
              </Field>
            </EditCard>

            <EditCard title="Photos" description="The first photo is the cover. Drag to reorder, or pick “Make cover”. Changes apply when you save.">
              <MediaManager initialUrls={mediaUrls} />
            </EditCard>
          </>
        }
        aside={
          <div className={cn(cardClass, 'grid gap-3 p-5')}>
            <p className="text-sm text-kiranam-muted">
              Upcoming or past is worked out from the date — change the date to move an event between the two.
            </p>
            <SubmitButton className="w-full">Save changes</SubmitButton>
            {event.created_at && <p className="text-center text-xs text-kiranam-muted">Created {formatDate(event.created_at)}</p>}
          </div>
        }
      />
    </Form>
  );
}
