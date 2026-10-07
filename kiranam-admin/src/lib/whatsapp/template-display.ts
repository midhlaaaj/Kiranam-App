// Human-facing wording for Meta template metadata. Meta names are
// lowercase_snake ("donation_receipt_v2") and categories are billing
// classes — admins need plain words and what each one means for them.

/** "donation_receipt_v2" → "Donation receipt v2" */
export function templateDisplayName(name: string) {
  const s = name.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Donation Receipt!" → "donation_receipt" — the only format Meta accepts. */
export function toTemplateSlug(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 512);
}

export const TEMPLATE_CATEGORY_INFO: Record<string, { label: string; hint: string }> = {
  Utility: {
    label: 'Utility',
    hint: 'Receipts, reminders and updates about something the person already did. Cheaper and approved faster.',
  },
  Marketing: {
    label: 'Marketing',
    hint: 'Appeals, campaigns and announcements. Costs more per message and people can opt out.',
  },
  Authentication: {
    label: 'Authentication',
    hint: 'One-time login codes only. Created in Meta’s WhatsApp Manager, not here.',
  },
};
