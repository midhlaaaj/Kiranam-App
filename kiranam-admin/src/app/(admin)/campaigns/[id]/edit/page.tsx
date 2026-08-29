import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deleteCampaignImage, updateCampaign } from '../../actions';
import { buttonPrimary, cardClass, formatMoney, inputClass, linkDanger } from '@/lib/ui';
import { Form } from '@/components/Form';

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

      <Form action={updateCampaign.bind(null, id)} className={`mt-6 grid max-w-xl gap-3 ${cardClass} p-5`}>
        <input name="title" defaultValue={campaign.title} required className={inputClass} />
        <textarea name="description" defaultValue={campaign.description} className={inputClass} />
        <input name="goal" type="number" defaultValue={campaign.goal} required className={inputClass} />
        <p className="text-sm text-kiranam-muted">
          Raised so far: <span className="tabular-nums font-semibold text-kiranam-ink">{formatMoney(Number(campaign.raised))}</span>{' '}
          — updates automatically from successful contributions.
        </p>
        <select name="status" defaultValue={campaign.status} className={inputClass}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">End date (optional)</label>
          <input name="end_date" type="date" defaultValue={campaign.end_date || ''} className={inputClass} />
          <p className="mt-1 text-xs text-kiranam-muted">Campaign auto-completes once this date passes.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">Cover image</label>
          {campaign.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.cover_image_url} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
          )}
          <input
            name="cover"
            type="file"
            accept="image/*"
            className={`${inputClass} file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-kiranam-surface-alt file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-kiranam-ink`}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-kiranam-ink">Add gallery images</label>
          <input
            name="gallery"
            type="file"
            accept="image/*"
            multiple
            className={`${inputClass} file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-kiranam-surface-alt file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-kiranam-ink`}
          />
        </div>

        <button type="submit" className={buttonPrimary}>
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
                <form action={deleteCampaignImage.bind(null, img.id, id)} className="mt-1">
                  <button type="submit" className={linkDanger}>
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
