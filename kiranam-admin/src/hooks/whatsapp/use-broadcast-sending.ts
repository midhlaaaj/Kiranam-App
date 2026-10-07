'use client';

import { useState } from 'react';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { useAuth } from '@/hooks/whatsapp/use-auth';
import { Contact, MessageTemplate } from '@/types/whatsapp';
import {
  fetchAllRecipients,
  resolveAudience as resolveAudienceShared,
  type AudienceConfig,
} from '@/lib/whatsapp/broadcast-audience';

export type { AudienceConfig, CustomFieldFilter, CustomFieldOperator } from '@/lib/whatsapp/broadcast-audience';

/**
 * Variable mapping — each template placeholder (by key, usually "1",
 * "2", …) is resolved at send time. `field` maps to a built-in contact
 * field (name/phone/email/company); `custom_field` maps to a
 * contact_custom_values.value row keyed by the custom_fields.id stored
 * in `value`.
 */
export type VariableMapping =
  | { type: 'static'; value: string }
  | { type: 'field'; value: string }
  | { type: 'custom_field'; value: string };

interface BroadcastPayload {
  name: string;
  template: MessageTemplate;
  audience: AudienceConfig;
  variables: Record<string, VariableMapping>;
  /**
   * Media URL for an IMAGE/VIDEO/DOCUMENT header. Required at send
   * time for media-header templates — Meta rejects the send without
   * it. Passed through as `messageParams.headerMediaUrl`; the builder
   * falls back to the template's stored URL only when this is empty.
   */
  headerMediaUrl?: string;
}

interface UseBroadcastSendingReturn {
  createAndSendBroadcast: (payload: BroadcastPayload) => Promise<string>;
  retryFailed: (broadcastId: string) => Promise<{ retried: number; failed: number }>;
  isProcessing: boolean;
  progress: number;
  /** Recipients processed so far / total — for "Sending 240 of 1,200". */
  sentSoFar: number;
  totalToSend: number;
}

/**
 * Meta rate-limit buffer. 10 per batch + 1 s pause matches the spec
 * and keeps us comfortably under Meta's per-phone-number messaging
 * rate so a large broadcast never trips the upstream limiter.
 */
const SEND_BATCH_SIZE = 10;
const SEND_BATCH_DELAY_MS = 1000;

/** `broadcast_recipients` inserts are independent of the send rate. */
const INSERT_BATCH_SIZE = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BroadcastApiResult {
  phone: string;
  status: 'sent' | 'failed';
  whatsapp_message_id?: string;
  error?: string;
}

/** contactId → (customFieldId → value). */
type CustomValueIndex = Map<string, Map<string, string>>;

/**
 * Per-contact resolution of custom-field placeholders. Static and
 * built-in-field mappings resolve synchronously; custom fields read
 * from a pre-built index to avoid N+1 queries during the send loop.
 */
function resolveVariables(
  variables: Record<string, VariableMapping>,
  contact: Contact,
  customValues?: Map<string, string>,
): string[] {
  // Keys are typically "1","2",... — numeric-aware sort keeps
  // {{1}} before {{10}}.
  const keys = Object.keys(variables).sort((a, b) => {
    const an = Number(a);
    const bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return a.localeCompare(b);
  });

  return keys.map((key) => {
    const v = variables[key];
    if (v.type === 'static') return v.value;

    if (v.type === 'field') {
      const fieldMap: Record<string, string | undefined> = {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
      };
      return fieldMap[v.value] ?? '';
    }

    // custom_field
    return customValues?.get(v.value) ?? '';
  });
}

/**
 * Bulk-fetch contact_custom_values for a set of contacts. Returns an
 * index keyed by contact_id → field_id → value.
 */
async function fetchCustomValueIndex(
  supabase: ReturnType<typeof createClient>,
  contactIds: string[],
): Promise<CustomValueIndex> {
  const index: CustomValueIndex = new Map();
  if (contactIds.length === 0) return index;

  // Supabase PostgREST caps the .in(...) IN-clause roughly at 1000
  // values. Page through to stay safe.
  // 100 contacts per request keeps (contacts × fields) under PostgREST's
  // 1000-row response cap.
  const PAGE = 100;
  for (let i = 0; i < contactIds.length; i += PAGE) {
    const slice = contactIds.slice(i, i + PAGE);
    const { data } = await supabase
      .from('contact_custom_values')
      .select('contact_id, custom_field_id, value')
      .in('contact_id', slice);

    for (const row of data ?? []) {
      const bucket = index.get(row.contact_id) ?? new Map<string, string>();
      bucket.set(row.custom_field_id, row.value ?? '');
      index.set(row.contact_id, bucket);
    }
  }
  return index;
}

type RecipientWithContact = { id: string; contact: Contact | null };

/**
 * The send loop shared by a new broadcast and "Retry failed": personalises
 * each message, posts in rate-limited batches, and records every
 * recipient's outcome (sent / failed + reason). Returns the failure count.
 */
async function sendToRecipients(
  supabase: ReturnType<typeof createClient>,
  recipients: RecipientWithContact[],
  opts: {
    templateName: string;
    templateLanguage: string;
    headerType?: MessageTemplate['header_type'];
    headerMediaUrl?: string;
    variables: Record<string, VariableMapping>;
    onProgress?: (done: number) => void;
  },
): Promise<number> {
  const markFailed = (id: string, message: string) =>
    supabase.from('broadcast_recipients').update({ status: 'failed', error_message: message }).eq('id', id);

  // One bulk fetch of custom values for every contact, avoiding N+1.
  const contactIds = recipients.map((r) => r.contact?.id).filter((id): id is string => Boolean(id));
  const customValueIndex = await fetchCustomValueIndex(supabase, contactIds);

  // Media-header templates need a media URL on every send; falls back to
  // the template's stored URL on the server when omitted.
  const isMediaHeader = opts.headerType === 'image' || opts.headerType === 'video' || opts.headerType === 'document';
  const headerMediaUrl = opts.headerMediaUrl?.trim();
  const messageParams = isMediaHeader && headerMediaUrl ? { headerMediaUrl } : undefined;

  let failedCount = 0;
  for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + SEND_BATCH_SIZE);

    // Recipients without a phone can't be sent — record why instead of
    // leaving them "pending" forever.
    for (const r of batch) {
      if (!r.contact?.phone) {
        failedCount++;
        await markFailed(r.id, 'No phone number on contact');
      }
    }
    const sendable = batch.filter((r) => r.contact?.phone);
    const apiRecipients = sendable.map((r) => ({
      phone: r.contact!.phone as string,
      params: resolveVariables(opts.variables, r.contact!, customValueIndex.get(r.contact!.id)),
      ...(messageParams ? { messageParams } : {}),
    }));

    if (apiRecipients.length > 0) {
      try {
        const res = await fetch('/api/whatsapp/whatsapp/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: apiRecipients,
            template_name: opts.templateName,
            template_language: opts.templateLanguage,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Broadcast API request failed');

        const resultsByPhone = new Map<string, BroadcastApiResult>();
        for (const r of (data.results ?? []) as BroadcastApiResult[]) resultsByPhone.set(r.phone, r);

        for (const recipient of sendable) {
          const result = resultsByPhone.get(recipient.contact!.phone as string);
          if (result?.status === 'sent') {
            await supabase
              .from('broadcast_recipients')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                whatsapp_message_id: result.whatsapp_message_id ?? null,
                error_message: null,
              })
              .eq('id', recipient.id);
          } else {
            failedCount++;
            await markFailed(recipient.id, result?.error ?? 'No result returned for this number');
          }
        }
      } catch (err) {
        for (const recipient of sendable) {
          failedCount++;
          await markFailed(recipient.id, err instanceof Error ? err.message : 'Unknown error');
        }
      }
    }

    opts.onProgress?.(i + batch.length);
    if (i + SEND_BATCH_SIZE < recipients.length) await sleep(SEND_BATCH_DELAY_MS);
  }
  return failedCount;
}

export function useBroadcastSending(): UseBroadcastSendingReturn {
  const { accountId } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sentSoFar, setSentSoFar] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);

  async function resolveAudience(audience: AudienceConfig): Promise<Contact[]> {
    const supabase = createClient();
    const { contacts } = await resolveAudienceShared(supabase, accountId, audience, {
      materializeCsv: (rows) => upsertCsvContacts(supabase, rows),
    });
    return contacts;
  }

  /**
   * CSV uploads arrive as raw phone/name pairs, not DB rows. Before we
   * can insert broadcast_recipients (whose contact_id FKs contacts.id),
   * we need real contacts.id UUIDs. So: look up each CSV phone in the
   * caller's contacts table; insert any that don't exist; return the
   * resolved set.
   *
   * Pre-existing implementation synthesized `csv-N` strings as
   * contact_id, which failed the UUID cast on insert — every CSV
   * broadcast silently created zero recipients.
   */
  async function upsertCsvContacts(
    supabase: ReturnType<typeof createClient>,
    csvRows: { phone: string; name?: string }[],
  ): Promise<Contact[]> {
    if (csvRows.length === 0) return [];

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      throw new Error('You are not signed in.');
    }
    if (!accountId) {
      throw new Error('Your profile is not linked to an account.');
    }

    // De-duplicate by phone within the CSV (users can paste duplicates).
    const uniqueByPhone = new Map<string, { phone: string; name?: string }>();
    for (const row of csvRows) {
      if (row.phone) uniqueByPhone.set(row.phone, row);
    }
    const phones = [...uniqueByPhone.keys()];

    // Single round-trip lookup of existing contacts by phone.
    const { data: existing, error: lookupErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .in('phone', phones);
    if (lookupErr) {
      throw new Error(`Failed to look up CSV contacts: ${lookupErr.message}`);
    }

    const byPhone = new Map<string, Contact>();
    for (const c of (existing ?? []) as Contact[]) {
      if (c.phone) byPhone.set(c.phone, c);
    }

    // Insert only missing contacts, in one batch per 200 rows (PostgREST
    // has a default payload cap — 200 keeps individual requests small).
    const missing = phones
      .filter((p) => !byPhone.has(p))
      .map((phone) => ({
        user_id: user.id,
        account_id: accountId,
        phone,
        name: uniqueByPhone.get(phone)?.name ?? null,
      }));

    const INSERT_CHUNK = 200;
    for (let i = 0; i < missing.length; i += INSERT_CHUNK) {
      const chunk = missing.slice(i, i + INSERT_CHUNK);
      const { data: inserted, error: insertErr } = await supabase
        .from('contacts')
        .insert(chunk)
        .select();
      if (insertErr) {
        throw new Error(`Failed to create CSV contacts: ${insertErr.message}`);
      }
      for (const c of (inserted ?? []) as Contact[]) {
        if (c.phone) byPhone.set(c.phone, c);
      }
    }

    // Preserve input order so analytics roughly matches the CSV order.
    return phones
      .map((p) => byPhone.get(p))
      .filter((c): c is Contact => Boolean(c));
  }

  async function createAndSendBroadcast(payload: BroadcastPayload): Promise<string> {
    setIsProcessing(true);
    setProgress(0);
    setSentSoFar(0);
    setTotalToSend(0);

    const supabase = createClient();

    try {
      // ── Step 0: Resolve current user ──────────────────────────────
      // broadcasts.user_id is NOT NULL + guarded by RLS
      // (auth.uid() = user_id). Without this, the INSERT below was
      // silently failing with 23502 / 42501 — the wizard would
      // no-op with no feedback.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('You are not signed in.');
      }
      if (!accountId) {
        throw new Error('Your profile is not linked to an account.');
      }

      // ── Step 1: Resolve audience contacts ─────────────────────────
      setProgress(5);
      const contacts = await resolveAudience(payload.audience);

      if (contacts.length === 0) {
        throw new Error('No contacts found for this audience.');
      }

      // ── Step 2: Create broadcast row ──────────────────────────────
      setProgress(10);
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          user_id: user.id,
          account_id: accountId,
          name: payload.name,
          template_name: payload.template.name,
          template_language: payload.template.language ?? 'en_US',
          template_variables: payload.variables,
          audience_filter: {
            type: payload.audience.type,
            tagIds: payload.audience.tagIds,
            customField: payload.audience.customField,
            excludeTagIds: payload.audience.excludeTagIds,
          },
          status: 'sending',
          total_recipients: contacts.length,
          sent_count: 0,
          delivered_count: 0,
          read_count: 0,
          replied_count: 0,
          failed_count: 0,
        })
        .select()
        .single();

      if (broadcastError || !broadcast) {
        throw new Error(
          `Failed to create broadcast: ${broadcastError?.message ?? 'unknown error'}`,
        );
      }

      // ── Step 3: Insert recipient rows ─────────────────────────────
      setProgress(20);
      const recipientRows = contacts.map((contact) => ({
        broadcast_id: broadcast.id,
        contact_id: contact.id,
        status: 'pending' as const,
      }));

      for (let i = 0; i < recipientRows.length; i += INSERT_BATCH_SIZE) {
        const batch = recipientRows.slice(i, i + INSERT_BATCH_SIZE);
        const { error: recipientError } = await supabase
          .from('broadcast_recipients')
          .insert(batch);
        if (recipientError) {
          // Previous impl logged and marched on — the broadcast then ran
          // with an incomplete recipient set, so webhook status updates
          // couldn't find some rows and the aggregate counts drifted.
          // Flip the broadcast to failed so the user sees the problem
          // immediately, then throw to abort the send loop.
          await supabase
            .from('broadcasts')
            .update({
              status: 'failed',
              failed_count: contacts.length,
            })
            .eq('id', broadcast.id);
          throw new Error(
            `Failed to insert recipient batch ${i / INSERT_BATCH_SIZE + 1}: ${recipientError.message}`,
          );
        }
      }

      // ── Step 4: Fetch recipients (joined contact) + preload custom values
      setProgress(30);
      // Paged — a single select caps at 1000 rows, which silently skipped
      // everyone past the first 1000 recipients.
      const recipients = await fetchAllRecipients<{
        id: string;
        contact: Contact | null;
      }>(supabase, broadcast.id);
      setTotalToSend(recipients.length);

      const totalRecipients = recipients.length;
      const failedCount = await sendToRecipients(supabase, recipients, {
        templateName: payload.template.name,
        templateLanguage: payload.template.language ?? 'en_US',
        headerType: payload.template.header_type,
        headerMediaUrl: payload.headerMediaUrl,
        variables: payload.variables,
        onProgress: (done) => {
          setProgress(30 + Math.round((done / totalRecipients) * 60));
          setSentSoFar(done);
        },
      });

      // ── Step 5: Finalize status ───────────────────────────────────
      // Aggregate counts are maintained by the DB trigger (migration
      // 003); we only flip the final status here.
      setProgress(95);
      const finalStatus = failedCount === totalRecipients ? 'failed' : 'sent';
      await supabase
        .from('broadcasts')
        .update({ status: finalStatus })
        .eq('id', broadcast.id);

      setProgress(100);
      return broadcast.id;
    } finally {
      setIsProcessing(false);
    }
  }

  /**
   * Re-sends to just the recipients that failed, with the broadcast's
   * original template + variable mapping. Nobody who already received it
   * gets it twice.
   */
  async function retryFailed(broadcastId: string): Promise<{ retried: number; failed: number }> {
    setIsProcessing(true);
    setSentSoFar(0);
    setTotalToSend(0);
    const supabase = createClient();
    try {
      const { data: broadcast, error } = await supabase.from('broadcasts').select('*').eq('id', broadcastId).single();
      if (error || !broadcast) throw new Error('Broadcast not found.');
      const { data: template } = await supabase
        .from('message_templates')
        .select('*')
        .eq('name', broadcast.template_name)
        .eq('language', broadcast.template_language ?? 'en_US')
        .maybeSingle();

      const failed = (await fetchAllRecipients<RecipientWithContact & { status: string }>(supabase, broadcastId)).filter(
        (r) => r.status === 'failed',
      );
      if (failed.length === 0) return { retried: 0, failed: 0 };
      setTotalToSend(failed.length);

      await supabase.from('broadcasts').update({ status: 'sending' }).eq('id', broadcastId);
      const failedAgain = await sendToRecipients(supabase, failed, {
        templateName: broadcast.template_name,
        templateLanguage: broadcast.template_language ?? 'en_US',
        headerType: (template as MessageTemplate | null)?.header_type,
        variables: (broadcast.template_variables ?? {}) as Record<string, VariableMapping>,
        onProgress: setSentSoFar,
      });
      const { count: stillPending } = await supabase
        .from('broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcastId)
        .neq('status', 'failed');
      await supabase
        .from('broadcasts')
        .update({ status: (stillPending ?? 0) === 0 ? 'failed' : 'sent' })
        .eq('id', broadcastId);
      return { retried: failed.length, failed: failedAgain };
    } finally {
      setIsProcessing(false);
    }
  }

  return { createAndSendBroadcast, retryFailed, isProcessing, progress, sentSoFar, totalToSend };
}
