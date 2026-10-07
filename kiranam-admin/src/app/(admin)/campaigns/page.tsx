import { Suspense } from 'react';
import Link from 'next/link';
import { Archive, ArchiveRestore, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { archiveCampaign, deleteCampaign, unarchiveCampaign } from './actions';
import { CreateCampaignForm } from './CreateCampaignForm';
import { EmptyState } from '@/components/EmptyState';
import { AddNewPanel } from '@/components/AddNewPanel';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SkeletonTable } from '@/components/Skeleton';
import { PillTabs } from '@/components/PillTabs';
import { PreviewImage } from '@/components/ImageLightbox';
import { FilterResults, FilterRoot, FilterSearch } from '@/components/filters/FilterBar';
import { searchTerm } from '@/lib/search';
import {
  badgeClass,
  formatMoney,
  staggerDelay,
  tableCellClass,
  tableHeadRowClass,
  tableRowClass,
  tableWrapClass,
} from '@/lib/ui';

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  return (
    <FilterRoot>
      <AddNewPanel
        title="Campaigns"
        label="Add new campaign"
        modal
        filters={
          <PillTabs
            label="Status"
            items={[
              {
                key: 'all',
                label: 'All',
                href: `/campaigns${q ? `?q=${encodeURIComponent(q)}` : ''}`,
                active: !status,
              },
              {
                key: 'active',
                label: 'Ongoing',
                href: `/campaigns?status=active${q ? `&q=${encodeURIComponent(q)}` : ''}`,
                active: status === 'active',
              },
              {
                key: 'completed',
                label: 'Completed',
                href: `/campaigns?status=completed${q ? `&q=${encodeURIComponent(q)}` : ''}`,
                active: status === 'completed',
              },
              {
                key: 'archived',
                label: 'Archived',
                href: `/campaigns?status=archived${q ? `&q=${encodeURIComponent(q)}` : ''}`,
                active: status === 'archived',
              },
            ]}
          />
        }
        search={<FilterSearch placeholder="Search campaigns" label="Search campaigns" />}
      >
        <CreateCampaignForm />
      </AddNewPanel>

      <FilterResults>
        <Suspense key={`${q ?? ''}:${status ?? ''}`} fallback={<SkeletonTable rows={5} cols={4} />}>
          <CampaignsTable q={q} status={status} />
        </Suspense>
      </FilterResults>
    </FilterRoot>
  );
}

async function CampaignsTable({ q, status }: { q?: string; status?: string }) {
  const supabase = await createClient();

  // Self-heal: a campaign whose end date has passed, or whose goal has been
  // reached, becomes "completed" automatically — matching the same two
  // conditions the mobile app already checks client-side.
  await supabase.rpc('self_heal_campaign_completion');

  // Archived campaigns are hidden everywhere except the dedicated Archived
  // tab — including under All/Ongoing/Completed, which otherwise filter on
  // `status` alone and know nothing about archival.
  const showArchived = status === 'archived';

  let query = supabase
    .from('campaigns')
    .select('id, title, status, raised, goal, cover_image_url, archived')
    .eq('archived', showArchived)
    .order('created_at', { ascending: false });
  const term = searchTerm(q);
  if (term) query = query.ilike('title', `%${term}%`);
  if (status === 'active' || status === 'completed') query = query.eq('status', status);

  const { data: campaigns } = await query;

  return (
    <div className={tableWrapClass}>
      {(campaigns || []).length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={q || status ? 'No campaigns match these filters' : 'No campaigns yet'}
          description={q || status ? 'Try a different search or clear the status tab.' : 'Use “Add new campaign” to create your first one.'}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Title</th>
              <th className={`${tableCellClass} hidden sm:table-cell`}>Status</th>
              <th className={tableCellClass}>Raised / Goal</th>
              <th className={tableCellClass}></th>
            </tr>
          </thead>
          <tbody>
            {(campaigns || []).map((c, i) => (
              <tr key={c.id} className={tableRowClass} style={staggerDelay(i)}>
                <td className={tableCellClass}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {c.cover_image_url ? (
                      <PreviewImage src={c.cover_image_url} alt={c.title} className="h-10 w-10 rounded-lg object-cover" buttonClassName="shrink-0" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-kiranam-primary-soft" />
                    )}
                    <span className="font-semibold text-kiranam-ink">{c.title}</span>
                    <span className={`${badgeClass(c.status === 'active' ? 'success' : 'neutral')} sm:hidden`}>{c.status}</span>
                  </div>
                </td>
                <td className={`${tableCellClass} hidden sm:table-cell`}>
                  <span className={badgeClass(c.status === 'active' ? 'success' : 'neutral')}>{c.status}</span>
                </td>
                <td className={`${tableCellClass} min-w-[160px]`}>
                  <div className="tabular-nums text-kiranam-muted">
                    {formatMoney(Number(c.raised))} / {formatMoney(Number(c.goal))}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-kiranam-surface-alt">
                    <div
                      className={`h-full rounded-full ${Number(c.goal) > 0 && Number(c.raised) / Number(c.goal) >= 1 ? 'bg-kiranam-success' : 'bg-kiranam-primary'}`}
                      style={{
                        width: `${Number(c.goal) > 0 ? Math.min(100, Math.round((Number(c.raised) / Number(c.goal)) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/campaigns/${c.id}/edit`}
                      aria-label="Edit campaign"
                      title="Edit campaign"
                      className="flex h-9 w-9 items-center justify-center cursor-pointer rounded-lg text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </Link>
                    {c.archived ? (
                      <ConfirmSubmitButton
                        action={unarchiveCampaign.bind(null, c.id)}
                        label={<ArchiveRestore size={16} strokeWidth={2} />}
                        title="Unarchive this campaign?"
                        description={`"${c.title}" will reappear in the main campaigns list${c.status === 'active' ? ' and to contributors in the app' : ''}.`}
                        confirmLabel="Unarchive"
                        successMessage="Campaign unarchived."
                        pendingMessage="Unarchiving…"
                        destructive={false}
                        className="flex h-9 w-9 items-center justify-center cursor-pointer rounded-lg text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
                        aria-label="Unarchive campaign"
                      />
                    ) : (
                      <ConfirmSubmitButton
                        action={archiveCampaign.bind(null, c.id)}
                        label={<Archive size={16} strokeWidth={2} />}
                        title="Archive this campaign?"
                        description={`"${c.title}" will be hidden from the main list and from contributors in the app, but its record and contribution history stay intact. You can unarchive it later.`}
                        confirmLabel="Archive"
                        successMessage="Campaign archived."
                        pendingMessage="Archiving…"
                        destructive={false}
                        className="flex h-9 w-9 items-center justify-center cursor-pointer rounded-lg text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
                        aria-label="Archive campaign"
                      />
                    )}
                    <ConfirmSubmitButton
                      action={deleteCampaign.bind(null, c.id)}
                      label={<Trash2 size={16} strokeWidth={2} />}
                      title="Delete this campaign?"
                      description={`"${c.title}" and its images will be permanently deleted. This can't be undone.`}
                      confirmLabel="Delete campaign"
                      destructive
                      successMessage="Campaign deleted."
                      pendingMessage="Deleting campaign…"
                      className="flex h-9 w-9 items-center justify-center cursor-pointer rounded-lg text-kiranam-danger transition hover:bg-kiranam-danger-soft"
                      aria-label="Delete campaign"
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
