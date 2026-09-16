import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deleteCampaignImage, markCampaignFullyRaised, updateCampaign } from '../../actions';
import { buttonPrimary, buttonSecondary, cardClass, formatMoney, inputClass, linkDanger } from '@/lib/ui';
import { Form } from '@/components/Form';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';
import { FieldGroup, Field } from '@/components/FormField';
import { ImageCropField, COVER_CROP, GALLERY_CROP } from '@/components/ImageCropField';

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
  if (!campaign) notFound();

  const { data: images } = await supabase
    .from('campaign_images')
    .select('id, image_url')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true });

  return (
    <div>
      <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-kiranam-muted transition hover:text-kiranam-ink hover:underline">
        <ArrowLeft size={15} /> Back to Campaigns
      </Link>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-kiranam-ink">Edit Campaign</h1>

      <Form action={updateCampaign.bind(null, id)} className={`mt-6 max-w-xl ${cardClass} p-5`}>
        <FieldGroup label="Campaign details">
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" defaultValue={campaign.title} required className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={campaign.description}
              className={inputClass}
            />
          </Field>
        </FieldGroup>

        <FieldGroup label="Funding">
          <Field label="Goal (₹)" htmlFor="goal">
            <input id="goal" name="goal" type="number" min="1" defaultValue={campaign.goal} required className={inputClass} />
          </Field>
          <p className="text-sm text-kiranam-muted">
            Raised so far:{' '}
            <span className="tabular-nums font-semibold text-kiranam-ink">{formatMoney(Number(campaign.raised))}</span>{' '}
            — updates automatically from successful contributions.
          </p>
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" defaultValue={campaign.status} className={`${inputClass} cursor-pointer`}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="End date" hint="Campaign auto-completes once this date passes." optional htmlFor="end_date">
            <input id="end_date" name="end_date" type="date" defaultValue={campaign.end_date || ''} className={inputClass} />
          </Field>
        </FieldGroup>

        <FieldGroup label="Media" last>
          <Field label="Cover image">
            {campaign.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.cover_image_url} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
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

      {campaign.status !== 'completed' && (
        <div className="mt-4 max-w-xl">
          <ConfirmSubmitButton
            action={markCampaignFullyRaised.bind(null, id)}
            label="Mark as fully raised"
            title="Mark this campaign as fully raised?"
            description={`This sets the raised amount to the full goal (${formatMoney(Number(campaign.goal))}) and marks the campaign as Completed.`}
            confirmLabel="Mark as fully raised"
            successMessage="Campaign marked as fully raised."
            pendingMessage="Updating campaign…"
            className={buttonSecondary}
          />
        </div>
      )}

      {(images || []).length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold tracking-tight text-kiranam-ink">Gallery</h2>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
            {(images || []).map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" className="h-24 w-full rounded-lg object-cover" />
                <ConfirmSubmitButton
                  action={deleteCampaignImage.bind(null, img.id, id)}
                  label="Delete"
                  title="Delete this image?"
                  description="This gallery image will be permanently removed from the campaign."
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
