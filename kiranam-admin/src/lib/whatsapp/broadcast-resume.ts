import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/whatsapp/whatsapp/encryption';
import { sendBroadcastMessage } from '@/lib/whatsapp/whatsapp/send-broadcast-message';
import { isMessageTemplate } from '@/lib/whatsapp/whatsapp/template-row-guard';
import { fetchKiranamDetails, needsKiranamDetails } from '@/lib/whatsapp/broadcast-fields';
import { fetchCustomValueIndex, resolveVariables, type VariableMapping } from '@/lib/whatsapp/broadcast-variables';
import {
  getOtpRecipientsLast24h,
  getSendLimits,
  planSend,
  recentlyMessagedContactIds,
  remainingAllowance,
} from '@/lib/whatsapp/send-limits';
import type { Contact, MessageTemplate } from '@/types/whatsapp';

// Server-side counterpart of the "Send remaining" button: continues broadcasts
// that stopped at the daily limit, for accounts that switched on "Continue
// automatically". Run by Vercel Cron (vercel.json). Allowance is the same
// rolling-24h figure the browser uses, so the two never disagree.

const CONCURRENCY = 10;
const TIME_BUDGET_MS = 240_000;

interface PendingRecipient {
  id: string;
  contact: Contact | null;
}

export interface ResumeResult {
  broadcastId: string;
  name: string;
  sent: number;
  failed: number;
  stillWaiting: number;
}

export async function resumeQueuedBroadcasts(): Promise<ResumeResult[]> {
  const supabase = createAdminClient();
  const startedAt = Date.now();
  const results: ResumeResult[] = [];

  const { data: configs } = await supabase
    .from('whatsapp_config')
    .select('account_id, phone_number_id, access_token')
    .eq('status', 'connected')
    .eq('auto_resume', true);

  const seen = new Set<string>();
  for (const config of configs ?? []) {
    if (!config.account_id || seen.has(config.account_id)) continue;
    seen.add(config.account_id);
    const accountId = config.account_id as string;
    const accessToken = decrypt(config.access_token);

    const limits = await getSendLimits(supabase, accountId);
    const messaged = await recentlyMessagedContactIds(supabase, accountId);

    const { data: queued } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    for (const broadcast of queued ?? []) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) return results;

      const pending: PendingRecipient[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from('broadcast_recipients')
          .select('id, contact:contacts(*)')
          .eq('broadcast_id', broadcast.id)
          .eq('status', 'pending')
          .order('id')
          .range(from, from + 999);
        pending.push(...((data ?? []) as unknown as PendingRecipient[]));
        if (!data || data.length < 1000) break;
      }
      if (pending.length === 0) {
        await supabase.from('broadcasts').update({ status: 'sent' }).eq('id', broadcast.id);
        continue;
      }

      const allowance = remainingAllowance(limits, messaged, await getOtpRecipientsLast24h(supabase));
      const { now: toSend, later: waiting } = planSend(pending, messaged, allowance);
      if (toSend.length === 0) break; // no allowance left for this account today

      const { data: rawTemplate } = await supabase
        .from('message_templates')
        .select('*')
        .eq('account_id', accountId)
        .eq('name', broadcast.template_name)
        .eq('language', broadcast.template_language ?? 'en_US')
        .maybeSingle();
      const template: MessageTemplate | null = rawTemplate && isMessageTemplate(rawTemplate) ? rawTemplate : null;

      const variables = (broadcast.template_variables ?? {}) as Record<string, VariableMapping>;
      const contactIds = toSend.map((r) => r.contact?.id).filter((id): id is string => !!id);
      const customValues = await fetchCustomValueIndex(supabase, contactIds);
      const fieldKeys = Object.values(variables)
        .filter((v) => v.type === 'field')
        .map((v) => v.value);
      const details = needsKiranamDetails(fieldKeys)
        ? await fetchKiranamDetails(supabase as never, contactIds)
        : new Map();

      let sent = 0;
      let failed = 0;
      let unsent = 0;
      const queue = [...toSend];

      const worker = async () => {
        for (let r = queue.shift(); r; r = queue.shift()) {
          if (Date.now() - startedAt > TIME_BUDGET_MS) {
            unsent++;
            continue;
          }
          const contact = r.contact;
          const fail = async (message: string) => {
            failed++;
            await supabase.from('broadcast_recipients').update({ status: 'failed', error_message: message }).eq('id', r.id);
          };
          if (!contact?.phone) {
            await fail('No phone number on contact');
            continue;
          }
          // Consent can be withdrawn between the broadcast and today.
          if (contact.whatsapp_consent === false) {
            await fail('Contact no longer consents to WhatsApp messages');
            continue;
          }
          const outcome = await sendBroadcastMessage({
            phoneNumberId: config.phone_number_id,
            accessToken,
            phone: contact.phone,
            inboxAccountId: accountId,
            templateName: broadcast.template_name,
            language: broadcast.template_language ?? 'en_US',
            template,
            params: resolveVariables(variables, contact, customValues.get(contact.id), details.get(contact.id)),
          });
          if (outcome.ok) {
            sent++;
            messaged.add(contact.id);
            await supabase
              .from('broadcast_recipients')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                whatsapp_message_id: outcome.messageId,
                error_message: null,
              })
              .eq('id', r.id);
          } else {
            await fail(outcome.error);
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      // `unsent` ran out of time budget and stays pending for the next run.
      const stillWaiting = waiting.length + unsent;
      const { count: reached } = await supabase
        .from('broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .neq('status', 'failed')
        .neq('status', 'pending');
      await supabase
        .from('broadcasts')
        .update({ status: stillWaiting > 0 ? 'queued' : (reached ?? 0) === 0 ? 'failed' : 'sent' })
        .eq('id', broadcast.id);
      results.push({ broadcastId: broadcast.id, name: broadcast.name, sent, failed, stillWaiting });
    }
  }
  return results;
}
