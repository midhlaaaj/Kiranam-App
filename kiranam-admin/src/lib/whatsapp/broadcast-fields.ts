import type { createClient } from '@/lib/whatsapp/supabase/client';
import type { Contact } from '@/types/whatsapp';

// "Fill with → From each contact's details" options for broadcast variables.
// The first group lives on the contact itself; the rest come from the linked
// Kiranam profile / commitment / payments via kiranam_contact_details().

type Supabase = ReturnType<typeof createClient>;

export const CONTACT_FIELD_KEYS = [
  'name',
  'first_name',
  'phone',
  'email',
  'company',
  'kk_number',
  'monthly_amount',
  'next_due_date',
  'autopay_status',
  'last_payment_date',
  'total_contributed',
] as const;

export type ContactFieldKey = (typeof CONTACT_FIELD_KEYS)[number];

/** Fields that need a Kiranam profile behind the contact. */
const KIRANAM_FIELDS = new Set<string>([
  'kk_number',
  'monthly_amount',
  'next_due_date',
  'autopay_status',
  'last_payment_date',
  'total_contributed',
]);

export interface KiranamDetails {
  kk_number: string | null;
  profile_email: string | null;
  monthly_amount: number | null;
  next_due_date: string | null;
  autopay_enabled: boolean | null;
  last_payment_date: string | null;
  total_contributed: number | null;
}

export type KiranamDetailsIndex = Map<string, KiranamDetails>;

/** One RPC per 300 contacts; the function runs under the caller's RLS. */
export async function fetchKiranamDetails(supabase: Supabase, contactIds: string[]): Promise<KiranamDetailsIndex> {
  const index: KiranamDetailsIndex = new Map();
  for (let i = 0; i < contactIds.length; i += 300) {
    const { data } = await supabase.rpc('kiranam_contact_details', { contact_ids: contactIds.slice(i, i + 300) });
    for (const row of (data ?? []) as (KiranamDetails & { contact_id: string })[]) {
      index.set(row.contact_id, {
        kk_number: row.kk_number,
        profile_email: row.profile_email,
        monthly_amount: row.monthly_amount === null ? null : Number(row.monthly_amount),
        next_due_date: row.next_due_date,
        autopay_enabled: row.autopay_enabled,
        last_payment_date: row.last_payment_date,
        total_contributed: row.total_contributed === null ? null : Number(row.total_contributed),
      });
    }
  }
  return index;
}

export function needsKiranamDetails(fieldKeys: string[]) {
  return fieldKeys.some((k) => KIRANAM_FIELDS.has(k));
}

const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;
const day = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(
    new Date(iso)
  );

/** The text a field puts into the message; '' when there is nothing to show. */
export function contactFieldValue(field: string, contact: Contact, details?: KiranamDetails): string {
  switch (field) {
    case 'name':
      return contact.name ?? '';
    case 'first_name':
      return (contact.name ?? '').trim().split(/\s+/)[0] ?? '';
    case 'phone':
      return contact.phone ?? '';
    case 'email':
      return contact.email || details?.profile_email || '';
    case 'company':
      return contact.company ?? '';
    case 'kk_number':
      return details?.kk_number ?? '';
    case 'monthly_amount':
      return details?.monthly_amount != null ? rupees(details.monthly_amount) : '';
    case 'next_due_date':
      return details?.next_due_date ? day(details.next_due_date) : '';
    case 'autopay_status':
      return details?.autopay_enabled == null ? '' : details.autopay_enabled ? 'On' : 'Off';
    case 'last_payment_date':
      return details?.last_payment_date ? day(details.last_payment_date) : '';
    case 'total_contributed':
      return details?.total_contributed != null ? rupees(details.total_contributed) : '';
    default:
      return '';
  }
}
