import { Suspense } from 'react';
import Link from 'next/link';
import { CalendarDays, Pencil, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { deleteEvent } from './actions';
import { CreateEventForm } from './CreateEventForm';
import { EmptyState } from '@/components/EmptyState';
import { AddNewPanel } from '@/components/AddNewPanel';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SkeletonTable } from '@/components/Skeleton';
import { PillTabs } from '@/components/PillTabs';
import {
  badgeClass,
  buttonPrimary,
  inputClass,
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
        modal
        filters={
          <PillTabs
            items={[
              { key: 'all', label: 'All', href: `/events${q ? `?q=${encodeURIComponent(q)}` : ''}`, active: !status },
              {
                key: 'upcoming',
                label: 'Upcoming',
                href: `/events?status=upcoming${q ? `&q=${encodeURIComponent(q)}` : ''}`,
                active: status === 'upcoming',
              },
              {
                key: 'past',
                label: 'Past',
                href: `/events?status=past${q ? `&q=${encodeURIComponent(q)}` : ''}`,
                active: status === 'past',
              },
            ]}
          />
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
        <CreateEventForm />
      </AddNewPanel>

      <Suspense fallback={<SkeletonTable rows={5} cols={5} />}>
        <EventsTable q={q} status={status} />
      </Suspense>
    </div>
  );
}

async function EventsTable({ q, status }: { q?: string; status?: string }) {
  const supabase = await createClient();

  // Self-heal in both directions: any event whose date has passed becomes
  // "past" automatically, regardless of whether an admin remembered to flip
  // it manually — and if a date gets edited back into the future (or was
  // set incorrectly), the flag is cleared too, so it can never get stuck
  // hiding an event that isn't actually past (kiranam-app treats is_past as
  // authoritative whenever event_date is missing, so a stuck `true` here
  // would otherwise never self-correct).
  const today = new Date().toISOString().slice(0, 10);
  await Promise.all([
    supabase.from('events').update({ is_past: true }).lt('event_date', today).eq('is_past', false),
    supabase.from('events').update({ is_past: false }).gte('event_date', today).eq('is_past', true),
  ]);

  let query = supabase
    .from('events')
    .select('id, title, event_date, location, is_past, cover_image_url')
    .order('event_date', { ascending: false });
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
              <th className={`${tableCellClass} hidden sm:table-cell`}>Location</th>
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
                <td className={`${tableCellClass} hidden text-kiranam-muted sm:table-cell`}>{e.location}</td>
                <td className={tableCellClass}>
                  <span className={badgeClass(e.is_past ? 'neutral' : 'success')}>{e.is_past ? 'Past' : 'Upcoming'}</span>
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/events/${e.id}/edit`}
                      aria-label="Edit event"
                      title="Edit event"
                      className="flex h-9 w-9 items-center justify-center cursor-pointer rounded-lg text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
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
                      className="flex h-9 w-9 items-center justify-center cursor-pointer rounded-lg text-kiranam-danger transition hover:bg-kiranam-danger-soft"
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
