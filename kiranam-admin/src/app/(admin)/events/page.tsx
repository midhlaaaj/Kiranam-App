import { Suspense } from 'react';
import Link from 'next/link';
import { CalendarDays, Pencil, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createEvent, deleteEvent } from './actions';
import { EmptyState } from '@/components/EmptyState';
import { AddNewPanel } from '@/components/AddNewPanel';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SkeletonTable } from '@/components/Skeleton';
import {
  badgeClass,
  buttonPrimary,
  cardClass,
  inputClass,
  pillTabClass,
  pillTabItemClass,
  staggerDelay,
  tableCellClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  return (
    <div>
      <AddNewPanel
        title="Events"
        label="Add new event"
        filters={
          <div className={pillTabClass}>
            <Link href={`/events${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={pillTabItemClass(!status)}>
              All
            </Link>
            <Link
              href={`/events?status=upcoming${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={pillTabItemClass(status === 'upcoming')}
            >
              Upcoming
            </Link>
            <Link
              href={`/events?status=past${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={pillTabItemClass(status === 'past')}
            >
              Past
            </Link>
          </div>
        }
        search={
          <form className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-kiranam-muted" />
              <input
                type="search"
                name="q"
                placeholder="Search events…"
                defaultValue={q}
                className={`${inputClass} w-56 pl-9`}
              />
            </div>
            {status && <input type="hidden" name="status" value={status} />}
            <button type="submit" className={buttonPrimary}>
              Search
            </button>
          </form>
        }
      >
        <form action={createEvent} className={`grid gap-3 ${cardClass} p-5 sm:grid-cols-2`}>
          <input name="title" placeholder="Title" required className={`${inputClass} sm:col-span-2`} />
          <textarea name="description" placeholder="Description" className={`${inputClass} sm:col-span-2`} />
          <input name="event_date" type="date" required className={inputClass} />
          <input name="time_label" placeholder="Time (e.g. 9:00 AM – 1:00 PM)" className={inputClass} />
          <input name="location" placeholder="Location" required className={`${inputClass} sm:col-span-2`} />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">Cover image (optional)</label>
            <input name="cover" type="file" accept="image/*" className={`${inputClass} file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-kiranam-surface-alt file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-kiranam-ink`} />
          </div>
          <button type="submit" className={`${buttonPrimary} sm:col-span-2`}>
            Create Event
          </button>
        </form>
      </AddNewPanel>

      <Suspense fallback={<SkeletonTable rows={5} cols={5} />}>
        <EventsTable q={q} status={status} />
      </Suspense>
    </div>
  );
}

async function EventsTable({ q, status }: { q?: string; status?: string }) {
  const supabase = await createClient();

  // Self-heal: any event whose date has passed becomes "past" automatically,
  // regardless of whether an admin remembered to flip it manually.
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('events').update({ is_past: true }).lt('event_date', today).eq('is_past', false);

  let query = supabase.from('events').select('*').order('event_date', { ascending: false });
  if (q) query = query.ilike('title', `%${q}%`);
  if (status === 'upcoming') query = query.eq('is_past', false);
  if (status === 'past') query = query.eq('is_past', true);

  const { data: events } = await query;

  return (
    <div className={tableWrapClass}>
      {(events || []).length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" description="Create your first event above." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Title</th>
              <th className={tableCellClass}>Date</th>
              <th className={tableCellClass}>Location</th>
              <th className={tableCellClass}>Status</th>
              <th className={tableCellClass}></th>
            </tr>
          </thead>
          <tbody>
            {(events || []).map((e, i) => (
              <tr key={e.id} className={tableRowClass} style={staggerDelay(i)}>
                <td className={tableCellClass}>
                  <div className="flex items-center gap-3">
                    {e.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.cover_image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-kiranam-surface-alt" />
                    )}
                    <span className="font-semibold text-kiranam-ink">{e.title}</span>
                  </div>
                </td>
                <td className={`${tableCellClass} tabular-nums text-kiranam-muted`}>
                  {e.event_date ? new Date(e.event_date).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className={`${tableCellClass} text-kiranam-muted`}>{e.location}</td>
                <td className={tableCellClass}>
                  <span className={badgeClass(e.is_past ? 'neutral' : 'success')}>{e.is_past ? 'Past' : 'Upcoming'}</span>
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/events/${e.id}/edit`}
                      aria-label="Edit event"
                      title="Edit event"
                      className="cursor-pointer rounded-lg p-2 text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </Link>
                    <ConfirmSubmitButton
                      action={deleteEvent.bind(null, e.id)}
                      label={<Trash2 size={16} strokeWidth={2} />}
                      title="Delete this event?"
                      description={`"${e.title}" and its images will be permanently deleted. This can't be undone.`}
                      confirmLabel="Delete event"
                      successMessage="Event deleted."
                      pendingMessage="Deleting event…"
                      className="cursor-pointer rounded-lg p-2 text-kiranam-danger transition hover:bg-kiranam-danger-soft"
                      aria-label="Delete event"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
