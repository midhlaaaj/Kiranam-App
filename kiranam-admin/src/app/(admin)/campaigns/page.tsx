import { Suspense } from 'react';
import Link from 'next/link';
import { Megaphone, Pencil, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createCampaign, deleteCampaign } from './actions';
import { EmptyState } from '@/components/EmptyState';
import { AddNewPanel } from '@/components/AddNewPanel';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { SkeletonTable } from '@/components/Skeleton';
import {
  badgeClass,
  buttonPrimary,
  cardClass,
  formatMoney,
  inputClass,
  pillTabClass,
  pillTabItemClass,
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
    <div>
      <AddNewPanel
        title="Campaigns"
        label="Add new campaign"
        filters={
          <div className={pillTabClass}>
            <Link href={`/campaigns${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={pillTabItemClass(!status)}>
              All
            </Link>
            <Link
              href={`/campaigns?status=active${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={pillTabItemClass(status === 'active')}
            >
              Ongoing
            </Link>
            <Link
              href={`/campaigns?status=completed${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={pillTabItemClass(status === 'completed')}
            >
              Completed
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
                placeholder="Search campaigns…"
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
        <form action={createCampaign} className={`grid gap-3 ${cardClass} p-5 sm:grid-cols-2`}>
          <input name="title" placeholder="Title" required className={`${inputClass} sm:col-span-2`} />
          <textarea name="description" placeholder="Description" className={`${inputClass} sm:col-span-2`} />
          <input name="goal" type="number" placeholder="Goal (₹)" required className={inputClass} />
          <input name="raised" type="number" placeholder="Already raised (₹, optional)" className={inputClass} />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">Cover image (optional)</label>
            <input name="cover" type="file" accept="image/*" className={`${inputClass} file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-kiranam-surface-alt file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-kiranam-ink`} />
          </div>
          <button type="submit" className={`${buttonPrimary} sm:col-span-2`}>
            Create Campaign
          </button>
        </form>
      </AddNewPanel>

      <Suspense fallback={<SkeletonTable rows={5} cols={4} />}>
        <CampaignsTable q={q} status={status} />
      </Suspense>
    </div>
  );
}

async function CampaignsTable({ q, status }: { q?: string; status?: string }) {
  const supabase = await createClient();

  let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  if (q) query = query.ilike('title', `%${q}%`);
  if (status === 'active' || status === 'completed') query = query.eq('status', status);

  const { data: campaigns } = await query;

  return (
    <div className={tableWrapClass}>
      {(campaigns || []).length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Create your first campaign above." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className={tableCellClass}>Title</th>
              <th className={tableCellClass}>Status</th>
              <th className={tableCellClass}>Raised / Goal</th>
              <th className={tableCellClass}></th>
            </tr>
          </thead>
          <tbody>
            {(campaigns || []).map((c, i) => (
              <tr key={c.id} className={tableRowClass} style={staggerDelay(i)}>
                <td className={tableCellClass}>
                  <div className="flex items-center gap-3">
                    {c.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.cover_image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-kiranam-primary-soft" />
                    )}
                    <span className="font-semibold text-kiranam-ink">{c.title}</span>
                  </div>
                </td>
                <td className={tableCellClass}>
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
                      className="cursor-pointer rounded-lg p-2 text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </Link>
                    <ConfirmSubmitButton
                      action={deleteCampaign.bind(null, c.id)}
                      label={<Trash2 size={16} strokeWidth={2} />}
                      title="Delete this campaign?"
                      description={`"${c.title}" and its images will be permanently deleted. This can't be undone.`}
                      confirmLabel="Delete campaign"
                      successMessage="Campaign deleted."
                      pendingMessage="Deleting campaign…"
                      className="cursor-pointer rounded-lg p-2 text-kiranam-danger transition hover:bg-kiranam-danger-soft"
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
