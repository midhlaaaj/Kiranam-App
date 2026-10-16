import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/audit';
import { sendEmailBatch } from '@/lib/email/resend';
import { newCampaignEmail } from '@/lib/email/templates';
import { listCommunityRecipients } from './recipients';
import { getKiranamWhatsApp, KIRANAM_TEMPLATES, mapLimit, templateText } from './whatsapp';

const WHATSAPP_CONCURRENCY = 10;

/** WhatsApp image headers must be JPEG or PNG — anything else (e.g. a WebP
 * cover) falls back to the template's approved sample image. */
async function whatsappSafeImage(url: string | null): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    return res.ok && (type === 'image/jpeg' || type === 'image/png') ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Tells every contributor and coordinator about a newly created campaign
 * by WhatsApp (everyone with a phone number who hasn't paused) and email
 * (verified addresses). The app push is sent by the database trigger.
 * Runs in the background after the create action responds; failures are
 * logged, never thrown back to the admin. */
export async function notifyNewCampaign(campaignId: string, adminId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, title, description, goal, cover_image_url')
    .eq('id', campaignId)
    .single();
  if (error || !campaign) {
    console.error('[notifyNewCampaign] campaign not found', campaignId, error);
    return;
  }

  const recipients = await listCommunityRecipients();
  const goal = Number(campaign.goal) || 0;
  const goalLabel = goal.toLocaleString('en-IN');
  const description = templateText(campaign.description, 'Support this campaign in the Karunya Kiranam app.', 200);

  // App push needs nothing here: the trg_notify_new_campaign database
  // trigger already notifies every contributor/coordinator on insert.

  // 1. WhatsApp — skipped (not failed) until the template is approved.
  let whatsapp = { ok: 0, failed: 0 };
  let whatsappSkipped: string | null = null;
  const wa = await getKiranamWhatsApp();
  const template = wa ? await wa.template(KIRANAM_TEMPLATES.newCampaign) : null;
  if (!wa) whatsappSkipped = 'WhatsApp not connected';
  else if (!template) whatsappSkipped = `template ${KIRANAM_TEMPLATES.newCampaign} not approved`;
  else {
    const headerMediaUrl = await whatsappSafeImage(campaign.cover_image_url);
    whatsapp = await mapLimit(
      recipients.filter((r) => r.phone && !r.paused),
      WHATSAPP_CONCURRENCY,
      (r) =>
        wa.send(r.phone!, template, {
          headerMediaUrl,
          body: [templateText(r.name, 'there', 60), templateText(campaign.title, 'New campaign', 100), description, goalLabel],
        }),
    );
  }

  // 2. Email to verified addresses.
  const appUrl = process.env.KIRANAM_PUBLIC_URL || 'https://kiranam.online';
  const email = await sendEmailBatch(
    recipients
      .filter((r) => r.verifiedEmail)
      .map((r) => ({
        to: r.verifiedEmail!,
        subject: `New campaign: ${campaign.title}`,
        html: newCampaignEmail({
          name: r.name,
          title: campaign.title,
          description: campaign.description ?? '',
          goal,
          coverUrl: campaign.cover_image_url,
          appUrl,
        }),
      })),
  );

  await logAction(adminId, 'notify_new_campaign', 'campaigns', campaign.id, {
    label: campaign.title,
    whatsapp_sent: whatsapp.ok,
    whatsapp_failed: whatsapp.failed,
    whatsapp_skipped: whatsappSkipped,
    email_sent: email.sent,
    email_failed: email.failed,
  });
}
