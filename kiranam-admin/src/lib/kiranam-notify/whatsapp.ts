import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/whatsapp/whatsapp/encryption';
import { META_API_BASE, sendTemplateMessage } from '@/lib/whatsapp/whatsapp/meta-api';
import { recordOutboundTemplate } from '@/lib/whatsapp/whatsapp/record-outbound';
import { isMessageTemplate } from '@/lib/whatsapp/whatsapp/template-row-guard';
import { isValidE164, sanitizePhoneForMeta } from '@/lib/whatsapp/whatsapp/phone-utils';
import type { SendTimeParams } from '@/lib/whatsapp/whatsapp/template-send-builder';
import type { MessageTemplate } from '@/types/whatsapp';

/** Names of the Meta templates Kiranam's automatic messages use — must
 * match what was submitted in WhatsApp → Templates (see
 * docs/whatsapp-templates.md). */
export const KIRANAM_TEMPLATES = {
  paymentReceipt: 'kiranam_payment_receipt',
  newCampaign: 'kiranam_new_campaign',
  reminderUpcoming: 'kiranam_reminder_upcoming',
  reminderDueToday: 'kiranam_reminder_due_today',
  reminderOverdue: 'kiranam_reminder_overdue',
} as const;

export interface KiranamWhatsApp {
  phoneNumberId: string;
  accessToken: string;
  /** Sends `templateName` to `phone`. Throws on Meta errors. */
  send: (phone: string, template: MessageTemplate, params: SendTimeParams) => Promise<void>;
  /** The approved template row, or null when it isn't approved (yet). */
  template: (name: string) => Promise<MessageTemplate | null>;
}

/** Kiranam's connected WhatsApp number (the same one the OTP hook uses),
 * or null when it isn't configured/connected — callers skip WhatsApp then. */
export async function getKiranamWhatsApp(): Promise<KiranamWhatsApp | null> {
  const accountId = process.env.KIRANAM_WACRM_ACCOUNT_ID;
  if (!accountId) {
    console.error('[kiranam-notify] KIRANAM_WACRM_ACCOUNT_ID not configured');
    return null;
  }
  const supabase = createAdminClient();

  // Filter to status='connected' + maybeSingle — a leftover pending row can
  // sit alongside the real one (see the send-sms auth hook).
  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('phone_number_id, access_token')
    .eq('account_id', accountId)
    .eq('status', 'connected')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!config) {
    console.error('[kiranam-notify] no connected whatsapp_config for account', accountId);
    return null;
  }

  const phoneNumberId: string = config.phone_number_id;
  const accessToken = decrypt(config.access_token);
  const templates = new Map<string, MessageTemplate | null>();

  return {
    phoneNumberId,
    accessToken,
    async template(name) {
      if (!templates.has(name)) {
        const { data } = await supabase
          .from('message_templates')
          .select('*')
          .eq('account_id', accountId)
          .eq('name', name)
          .eq('status', 'APPROVED')
          .limit(1)
          .maybeSingle();
        templates.set(name, data && isMessageTemplate(data) ? data : null);
      }
      return templates.get(name) ?? null;
    },
    async send(phone, template, params) {
      const to = sanitizePhoneForMeta(phone);
      if (!isValidE164(to)) throw new Error(`Invalid phone number: ${phone}`);
      const result = await sendTemplateMessage({
        phoneNumberId,
        accessToken,
        to,
        templateName: template.name,
        language: template.language || 'en_US',
        template,
        messageParams: params,
      });
      // Show receipts, reminders and campaign notices in the inbox thread too.
      await recordOutboundTemplate({
        accountId,
        phone: to,
        templateName: template.name,
        template,
        messageParams: params,
        waMessageId: result.messageId,
      });
    },
  };
}

/** Meta rejects body parameters containing newlines, tabs or 4+ spaces in a
 * row, and empty ones — flatten free text into a single safe line. */
export function templateText(value: string | null | undefined, fallback: string, maxLength = 300): string {
  const flat = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return fallback;
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1).trimEnd()}…` : flat;
}

/** Uploads a file to WhatsApp's media store and returns its id — used to
 * attach a per-recipient document (e.g. a receipt PDF) to a template
 * header without hosting it at a public URL. */
export async function uploadWhatsAppMedia(
  wa: Pick<KiranamWhatsApp, 'phoneNumberId' | 'accessToken'>,
  file: { bytes: Uint8Array; mimeType: string; fileName: string },
): Promise<string> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', file.mimeType);
  form.append('file', new Blob([file.bytes as BlobPart], { type: file.mimeType }), file.fileName);
  const res = await fetch(`${META_API_BASE}/${wa.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${wa.accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`WhatsApp media upload failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Runs `task` over `items` with at most `limit` in flight. */
export async function mapLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        await task(item);
        ok++;
      } catch (err) {
        failed++;
        console.error('[kiranam-notify] send failed', err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { ok, failed };
}
