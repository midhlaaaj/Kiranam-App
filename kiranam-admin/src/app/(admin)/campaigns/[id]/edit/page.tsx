import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { markCampaignFullyRaised, updateCampaign } from '../../actions';
import { badgeClass, buttonSecondary, cardClass, formatMoney, inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { Form } from '@/components/Form';
import { SubmitButton } from '@/components/SubmitButton';
import { EditCard, EditLayout } from '@/components/EditLayout';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { Field } from '@/components/FormField';
import { MediaManager } from '@/components/MediaManager';
import { formatDate } from '@/lib/format';

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();

  const { data: images } = await supabase
    .from('campaign_images')
    .select('id, image_url')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true });

  const raised = Number(campaign.raised);
  const goal = Number(campaign.goal);
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const completed = campaign.status === 'completed';

  // Cover first, then the gallery in order — the one list MediaManager edits.
  const mediaUrls = [campaign.cover_image_url, ...(images || []).map((i) => i.image_url)].filter((u): u is string => !!u);

  return (
    <Form action={updateCampaign.bind(null, id)}>
      <EditLayout
        backHref="/campaigns"
        backLabel="All campaigns"
        title={campaign.title}
        badge={
          <span className={badgeClass(campaign.archived ? 'neutral' : completed ? 'neutral' : 'success')}>
            {campaign.archived ? 'Archived' : completed ? 'Completed' : 'Ongoing'}
          </span>
        }
        main={
          <>
            <EditCard title="Details">
              <Field label="Title" htmlFor="title">
                <input id="title" name="title" defaultValue={campaign.title} required className={inputClass} />
              </Field>
              <Field label="Description" htmlFor="description" hint="Shown to donors in the app.">
                <textarea id="description" name="description" rows={5} defaultValue={campaign.description} className={cn(inputClass, 'resize-y')} />
              </Field>
            </EditCard>

            <EditCard title="Funding">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-2xl font-bold tabular-nums text-kiranam-ink">
                    {formatMoney(raised)} <span className="text-base font-medium text-kiranam-muted">of {formatMoney(goal)}</span>
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-kiranam-ink">{pct}%</p>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-kiranam-surface-alt"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Funding progress"
                >
                  <div className="h-full rounded-full bg-kiranam-success" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-kiranam-muted">Raised updates automatically from successful contributions.</p>
              </div>
              <Field label="Goal (₹)" htmlFor="goal">
                <div className="flex items-center rounded-lg border border-kiranam-input-border bg-kiranam-surface pl-3.5 focus-within:border-kiranam-primary focus-within:ring-3 focus-within:ring-kiranam-primary/15 sm:max-w-xs">
                  <span aria-hidden className="text-sm text-kiranam-muted">₹</span>
                  <input
                    id="goal"
                    name="goal"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    defaultValue={campaign.goal}
                    required
                    className="no-spinner w-full bg-transparent px-2 py-2.5 text-sm text-kiranam-ink focus:outline-none"
                  />
                </div>
              </Field>
            </EditCard>

            <EditCard title="Photos" description="The first photo is the cover. Drag to reorder, or pick “Make cover”. Changes apply when you save.">
              <MediaManager initialUrls={mediaUrls} />
            </EditCard>
          </>
        }
        aside={
          <>
            <div className={cn(cardClass, 'grid gap-4 p-5')}>
              <Field label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={campaign.status} className={cn(inputClass, 'cursor-pointer')}>
                  <option value="active">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </Field>
              <Field label="End date" htmlFor="end_date" optional hint="Completes automatically after this date.">
                <input id="end_date" name="end_date" type="date" defaultValue={campaign.end_date || ''} className={inputClass} />
              </Field>
              <SubmitButton className="w-full">Save changes</SubmitButton>
              <p className="text-center text-xs text-kiranam-muted">Created {formatDate(campaign.created_at)}</p>
            </div>

            {!completed && (
              <div className={cn(cardClass, 'p-5')}>
                <p className="text-sm font-medium text-kiranam-ink">Reached the goal offline?</p>
                <p className="mt-1 text-xs text-kiranam-muted">Sets raised to the full goal and marks the campaign completed.</p>
                <ConfirmSubmitButton
                  action={markCampaignFullyRaised.bind(null, id)}
                  label="Mark as fully raised"
                  title="Mark this campaign as fully raised?"
                  description={`This sets the raised amount to the full goal (${formatMoney(goal)}) and marks the campaign as Completed.`}
                  confirmLabel="Mark as fully raised"
                  successMessage="Campaign marked as fully raised."
                  pendingMessage="Updating campaign…"
                  className={cn(buttonSecondary, 'mt-3 w-full')}
                />
              </div>
            )}
          </>
        }
      />
    </Form>
  );
}
