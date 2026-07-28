'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit';
import { uploadPublicImage } from '@/lib/storage';

export async function createCampaign(formData: FormData) {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      goal: Number(formData.get('goal') || 0),
      raised: Number(formData.get('raised') || 0),
      end_date: String(formData.get('end_date') || '') || null,
      status: 'active',
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const cover = formData.get('cover');
  if (cover instanceof File && cover.size > 0) {
    const url = await uploadPublicImage('campaign-images', campaign.id, cover);
    await supabase.from('campaigns').update({ cover_image_url: url }).eq('id', campaign.id);
  }

  await logAction(admin.id, 'create_campaign', 'campaigns', campaign.id);
  revalidatePath('/campaigns');
}

export async function updateCampaign(id: string, formData: FormData) {
  const admin = await verifyAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('campaigns')
    .update({
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      goal: Number(formData.get('goal') || 0),
      // `raised` is intentionally NOT written here — it's auto-incremented by the
      // bump_campaign_raised DB trigger on successful contributions. Editing it
      // here would desync the displayed total from the real contribution sum.
      end_date: String(formData.get('end_date') || '') || null,
      status: String(formData.get('status') || 'active'),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  const cover = formData.get('cover');
  if (cover instanceof File && cover.size > 0) {
    const url = await uploadPublicImage('campaign-images', id, cover);
    await supabase.from('campaigns').update({ cover_image_url: url }).eq('id', id);
  }

  const galleryFiles = formData.getAll('gallery').filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of galleryFiles) {
    const url = await uploadPublicImage('campaign-images', id, file);
    await supabase.from('campaign_images').insert({ campaign_id: id, image_url: url });
  }

  await logAction(admin.id, 'update_campaign', 'campaigns', id);
  revalidatePath('/campaigns');
  redirect(`/campaigns/${id}/edit`);
}

export async function deleteCampaignImage(imageId: string, campaignId: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('campaign_images').delete().eq('id', imageId);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'delete_campaign_image', 'campaign_images', imageId, { campaignId });
  revalidatePath(`/campaigns/${campaignId}/edit`);
}

export async function deleteCampaign(id: string) {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await logAction(admin.id, 'delete_campaign', 'campaigns', id);
  revalidatePath('/campaigns');
}
