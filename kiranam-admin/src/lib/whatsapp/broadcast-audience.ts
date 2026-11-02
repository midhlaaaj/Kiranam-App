import type { createClient } from '@/lib/whatsapp/supabase/client';
import type { Contact } from '@/types/whatsapp';

// Single source of truth for "who receives this broadcast". The wizard's
// audience step, the review step and the actual send all call
// resolveAudience(), so the number an admin confirms is the number sent.

type Supabase = ReturnType<typeof createClient>;

export type CustomFieldOperator = 'is' | 'is_not' | 'contains';

export interface CustomFieldFilter {
  fieldId: string;
  operator: CustomFieldOperator;
  value: string;
}

export interface AudienceConfig {
  type: 'all' | 'tags' | 'custom_field' | 'csv' | 'contacts';
  tagIds?: string[];
  /** Hand-picked contacts (type 'contacts'). */
  contactIds?: string[];
  customField?: CustomFieldFilter;
  csvContacts?: { phone: string; name?: string }[];
  /** Contacts carrying any of these tags are subtracted from the result. */
  excludeTagIds?: string[];
}

export interface AudienceBreakdown {
  /** Contacts the audience rule matched, before any exclusions. */
  matched: number;
  /** Removed because they carry one of the chosen "exclude" tags. */
  excludedByTag: number;
  /** Removed because they paused their giving ("Paused" system tag). */
  paused: number;
  /** Removed because they turned off WhatsApp messages in the Kiranam app. */
  noConsent: number;
  /** Final count — exactly who the send goes to. */
  willReceive: number;
}

export function isAudienceComplete(a: AudienceConfig) {
  return (
    a.type === 'all' ||
    (a.type === 'tags' && !!a.tagIds?.length) ||
    (a.type === 'custom_field' && !!a.customField?.fieldId && !!a.customField.value) ||
    (a.type === 'csv' && !!a.csvContacts?.length) ||
    (a.type === 'contacts' && !!a.contactIds?.length)
  );
}

const PAGE = 1000;
const IN_CHUNK = 300;

type PageResult<T> = { data: T[] | null; error: { message: string } | null; count?: number | null };

/**
 * PostgREST caps responses at 1000 rows — page through everything. The first
 * page also asks for the total, so the remaining pages are fetched in
 * parallel rather than one round trip after another (slow on a phone).
 */
async function fetchAllPages<T>(page: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const first = await page(0, PAGE - 1);
  if (first.error) throw new Error(first.error.message);
  const out = [...(first.data ?? [])];
  if (!first.data || first.data.length < PAGE) return out;

  if (typeof first.count === 'number') {
    const starts: number[] = [];
    for (let from = PAGE; from < first.count; from += PAGE) starts.push(from);
    const rest = await Promise.all(starts.map((from) => page(from, from + PAGE - 1)));
    for (const r of rest) {
      if (r.error) throw new Error(r.error.message);
      out.push(...(r.data ?? []));
    }
    return out;
  }

  for (let from = PAGE; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** `.in('id', ids)` in URL-safe chunks, fetched in parallel. */
async function fetchContactsByIds(supabase: Supabase, ids: string[], columns: string): Promise<Contact[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) chunks.push(ids.slice(i, i + IN_CHUNK));
  const results = await Promise.all(chunks.map((chunk) => supabase.from('contacts').select(columns).in('id', chunk)));
  const out: Contact[] = [];
  for (const { data, error } of results) {
    if (error) throw new Error(`Failed to fetch contacts: ${error.message}`);
    out.push(...((data ?? []) as unknown as Contact[]));
  }
  return out;
}

async function contactIdsWithTags(supabase: Supabase, tagIds: string[]): Promise<Set<string>> {
  const rows = await fetchAllPages<{ contact_id: string }>((from, to) =>
    supabase.from('contact_tags').select('contact_id', { count: 'exact' }).in('tag_id', tagIds).range(from, to)
  );
  return new Set(rows.map((r) => r.contact_id));
}

async function pausedContactIds(supabase: Supabase, accountId: string): Promise<Set<string>> {
  const { data: pausedTag } = await supabase
    .from('tags')
    .select('id')
    .eq('account_id', accountId)
    .eq('name', 'Paused')
    .maybeSingle();
  return pausedTag ? contactIdsWithTags(supabase, [pausedTag.id]) : new Set();
}

async function matchCustomField(supabase: Supabase, filter: CustomFieldFilter): Promise<string[]> {
  const { fieldId, operator, value } = filter;
  const rows = await fetchAllPages<{ contact_id: string }>((from, to) => {
    let q = supabase.from('contact_custom_values').select('contact_id', { count: 'exact' }).eq('custom_field_id', fieldId);
    if (operator === 'is') q = q.eq('value', value);
    else if (operator === 'is_not') q = q.neq('value', value);
    else q = q.ilike('value', `%${value}%`);
    return q.range(from, to);
  });
  return [...new Set(rows.map((r) => r.contact_id))];
}

/**
 * Resolves an audience to concrete contacts plus a breakdown of who was
 * removed and why. For CSV audiences, `materializeCsv` creates contacts for
 * phones not yet in the CRM (send time only); without it, unknown phones
 * are counted as recipients but not created (preview).
 */
export async function resolveAudience(
  supabase: Supabase,
  accountId: string | null,
  audience: AudienceConfig,
  opts: {
    materializeCsv?: (rows: { phone: string; name?: string }[]) => Promise<Contact[]>;
    /** Contact columns to load. The "who will receive this" count only needs a few, which is far lighter than `*`. */
    columns?: string;
  } = {}
): Promise<{ contacts: Contact[]; breakdown: AudienceBreakdown; extraCsvRecipients: number }> {
  let contacts: Contact[] = [];
  let extraCsvRecipients = 0;
  const columns = opts.columns ?? '*';

  // The exclusion lookups don't depend on the matched contacts, so they run
  // alongside the main fetch instead of after it.
  const excludedPromise = audience.excludeTagIds?.length
    ? contactIdsWithTags(supabase, audience.excludeTagIds)
    : Promise.resolve(new Set<string>());
  const pausedPromise = accountId ? pausedContactIds(supabase, accountId) : Promise.resolve(new Set<string>());
  // Failures still surface through the awaits below; this only avoids an unhandled rejection.
  excludedPromise.catch(() => undefined);
  pausedPromise.catch(() => undefined);

  if (audience.type === 'all') {
    contacts = await fetchAllPages<Contact>(
      (from, to) =>
        supabase.from('contacts').select(columns, { count: 'exact' }).order('id').range(from, to) as unknown as PromiseLike<
          PageResult<Contact>
        >
    );
  } else if (audience.type === 'tags' && audience.tagIds?.length) {
    contacts = await fetchContactsByIds(supabase, [...(await contactIdsWithTags(supabase, audience.tagIds))], columns);
  } else if (audience.type === 'contacts' && audience.contactIds?.length) {
    contacts = await fetchContactsByIds(supabase, [...new Set(audience.contactIds)], columns);
  } else if (audience.type === 'custom_field' && audience.customField?.fieldId && audience.customField.value) {
    contacts = await fetchContactsByIds(supabase, await matchCustomField(supabase, audience.customField), columns);
  } else if (audience.type === 'csv' && audience.csvContacts?.length) {
    const unique = new Map(audience.csvContacts.filter((r) => r.phone).map((r) => [r.phone, r]));
    if (opts.materializeCsv) {
      contacts = await opts.materializeCsv([...unique.values()]);
    } else {
      const phones = [...unique.keys()];
      for (let i = 0; i < phones.length; i += IN_CHUNK) {
        const { data } = await supabase.from('contacts').select(columns).in('phone', phones.slice(i, i + IN_CHUNK));
        contacts.push(...((data ?? []) as unknown as Contact[]));
      }
      const known = new Set(contacts.map((c) => c.phone));
      extraCsvRecipients = phones.filter((p) => !known.has(p)).length;
    }
  }

  const matched = contacts.length + extraCsvRecipients;

  let excludedByTag = 0;
  if (audience.excludeTagIds?.length && contacts.length) {
    const excluded = await excludedPromise;
    const before = contacts.length;
    contacts = contacts.filter((c) => !excluded.has(c.id));
    excludedByTag = before - contacts.length;
  }

  // "Paused" (a contributor who paused their giving in the app) is always
  // excluded — composers shouldn't have to remember to pick it each time.
  let paused = 0;
  if (contacts.length && accountId) {
    const pausedIds = await pausedPromise;
    const before = contacts.length;
    contacts = contacts.filter((c) => !pausedIds.has(c.id));
    paused = before - contacts.length;
  }

  // Kiranam-synced contacts who unticked WhatsApp reminders (migration 027)
  // must never get broadcasts. CRM-only contacts have no consent flag.
  const before = contacts.length;
  contacts = contacts.filter((c) => c.whatsapp_consent !== false);
  const noConsent = before - contacts.length;

  return {
    contacts,
    extraCsvRecipients,
    breakdown: { matched, excludedByTag, paused, noConsent, willReceive: contacts.length + extraCsvRecipients },
  };
}

/** Pages through every recipient row of a broadcast (no 1000-row cap). */
export async function fetchAllRecipients<T>(supabase: Supabase, broadcastId: string): Promise<T[]> {
  return fetchAllPages<T>((from, to) =>
    supabase
      .from('broadcast_recipients')
      .select('*, contact:contacts(*)')
      .eq('broadcast_id', broadcastId)
      .order('id')
      .range(from, to) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>
  );
}
