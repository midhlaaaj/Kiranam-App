import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmailBatch } from '@/lib/email/resend';
import { reminderEmail, type ReminderKind } from '@/lib/email/templates';
import { getRecipients } from './recipients';
import { getKiranamWhatsApp, KIRANAM_TEMPLATES, mapLimit, templateText } from './whatsapp';

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** YYYY-MM-DD of `base` (an IST calendar date) shifted by `days`. */
function shiftDate(base: string, days: number): string {
  return new Date(Date.parse(`${base}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Today's calendar date in India. */
export function todayIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-20" → "20 Oct 2026" */
function dueLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Everyone's monthly due date is the 3rd. The first cycle this applies to is the 3 Dec 2026 due date,
 * so the first reminders go out on 30 Nov. */
const DUE_DAY = '03';
const FIRST_DUE_DATE = '2026-12-03';
/** Contributors with no monthly commitment on file are asked for the app's minimum. */
const DEFAULT_MONTHLY_AMOUNT = 30;

const PAGE = 1000;

/** The previous month's due date, which is also the cutoff for "already paid this cycle". */
function previousDueDate(dueDate: string): string {
  const [y, m] = dueDate.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  return `${prev}-${DUE_DAY}`;
}

/** Contributors still owing this cycle, with the amount to show them. Skips autopay, paused
 * contributions, and anyone who already paid a monthly contribution since the previous due date. */
async function contributorsOwing(
  supabase: ReturnType<typeof createAdminClient>,
  dueDate: string,
): Promise<Map<string, number>> {
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'contributor')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Could not load contributors: ${error.message}`);
    ids.push(...(data ?? []).map((p) => p.id as string));
    if (!data || data.length < PAGE) break;
  }

  const commitments = new Map<string, { amount: number; skip: boolean }>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('commitments')
      .select('contributor_id, monthly_amount, autopay_enabled, contribution_paused')
      .order('contributor_id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Could not load commitments: ${error.message}`);
    for (const c of data ?? []) {
      commitments.set(c.contributor_id as string, {
        amount: Number(c.monthly_amount) || 0,
        skip: Boolean(c.autopay_enabled || c.contribution_paused),
      });
    }
    if (!data || data.length < PAGE) break;
  }

  // Paid this cycle = a successful monthly payment (in the app, autopay, or added by an admin)
  // on or after the day after the previous due date, India time.
  const paidSince = `${shiftDate(previousDueDate(dueDate), 1)}T00:00:00+05:30`;
  const paid = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('contributions')
      .select('contributor_id')
      .eq('label', 'Monthly Contribution')
      .eq('status', 'success')
      .gte('created_at', paidSince)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Could not load payments: ${error.message}`);
    for (const p of data ?? []) paid.add(p.contributor_id as string);
    if (!data || data.length < PAGE) break;
  }

  const owing = new Map<string, number>();
  for (const id of ids) {
    const c = commitments.get(id);
    if (c?.skip || paid.has(id)) continue;
    owing.set(id, c?.amount || DEFAULT_MONTHLY_AMOUNT);
  }
  return owing;
}

const SCHEDULE: { kind: ReminderKind; offsetDays: number; template: string }[] = [
  { kind: 'upcoming', offsetDays: 3, template: KIRANAM_TEMPLATES.reminderUpcoming },
  { kind: 'due_today', offsetDays: 0, template: KIRANAM_TEMPLATES.reminderDueToday },
  // Paying moves next_due_date forward, so anyone still on a date 3 days
  // back hasn't paid.
  { kind: 'overdue', offsetDays: -3, template: KIRANAM_TEMPLATES.reminderOverdue },
];

const PUSH_TEXT: Record<ReminderKind, (amount: string, due: string) => { title: string; body: string }> = {
  upcoming: (a, d) => ({ title: 'Monthly Kiranam due soon', body: `Your ₹${a} contribution is due on ${d}.` }),
  due_today: (a) => ({ title: 'Monthly Kiranam due today', body: `Your ₹${a} contribution is due today.` }),
  overdue: (a, d) => ({ title: 'Monthly Kiranam pending', body: `Your ₹${a} contribution (due ${d}) is still pending.` }),
};

export interface ReminderRunResult {
  kind: ReminderKind;
  dueDate: string;
  recipients: number;
  push: number;
  whatsapp: number;
  whatsappSkipped?: string;
  email: number;
  failed: number;
}

/** Sends the day's monthly Kiranam reminders. `today` (YYYY-MM-DD, IST)
 * is overridable for testing. Skips contributors on active autopay or who
 * have paused contributions; each reminder is claimed in reminder_log
 * first, so re-running the same day sends nothing new. */
export async function sendKiranamReminders(today = todayIST()): Promise<ReminderRunResult[]> {
  const supabase = createAdminClient();
  const wa = await getKiranamWhatsApp();
  const appUrl = process.env.KIRANAM_PUBLIC_URL || 'https://kiranam.online';
  const results: ReminderRunResult[] = [];

  for (const step of SCHEDULE) {
    const dueDate = shiftDate(today, step.offsetDays);
    // Only the 3rd of a month, and only from the first cycle onward.
    if (!dueDate.endsWith(`-${DUE_DAY}`) || dueDate < FIRST_DUE_DATE) {
      results.push({ kind: step.kind, dueDate, recipients: 0, push: 0, whatsapp: 0, email: 0, failed: 0 });
      continue;
    }

    const amountById = await contributorsOwing(supabase, dueDate);
    if (amountById.size === 0) {
      results.push({ kind: step.kind, dueDate, recipients: 0, push: 0, whatsapp: 0, email: 0, failed: 0 });
      continue;
    }

    // Claim first — only rows this run actually inserted come back.
    const claimedIds: string[] = [];
    const owingIds = [...amountById.keys()];
    for (let i = 0; i < owingIds.length; i += 500) {
      const { data: claimed, error: claimError } = await supabase
        .from('reminder_log')
        .upsert(
          owingIds.slice(i, i + 500).map((id) => ({ profile_id: id, kind: step.kind, due_date: dueDate })),
          { onConflict: 'profile_id,kind,due_date', ignoreDuplicates: true },
        )
        .select('profile_id');
      if (claimError) throw new Error(`Could not record ${step.kind} reminders: ${claimError.message}`);
      claimedIds.push(...(claimed ?? []).map((c) => c.profile_id as string));
    }

    const recipients = await getRecipients(claimedIds);
    const label = dueLabel(dueDate);

    const push = await mapLimit(recipients, 20, async (r) => {
      const text = PUSH_TEXT[step.kind](amountById.get(r.id)!.toLocaleString('en-IN'), label);
      const { error: notifyError } = await supabase.rpc('notify', {
        p_profile_id: r.id,
        p_title: text.title,
        p_body: text.body,
        p_category: 'contribution',
        p_deep_link: '/choose-amount',
      });
      if (notifyError) throw new Error(notifyError.message);
    });

    let whatsapp = { ok: 0, failed: 0 };
    let whatsappSkipped: string | undefined;
    const template = wa ? await wa.template(step.template) : null;
    if (!wa) whatsappSkipped = 'WhatsApp not connected';
    else if (!template) whatsappSkipped = `template ${step.template} not approved`;
    else {
      whatsapp = await mapLimit(
        recipients.filter((r) => r.phone && r.whatsappConsent),
        10,
        (r) => {
          const amount = amountById.get(r.id)!.toLocaleString('en-IN');
          const name = templateText(r.name, 'there', 60);
          // due_today's template has no date variable.
          const body = step.kind === 'due_today' ? [name, amount] : [name, amount, label];
          return wa.send(r.phone!, template, { body });
        },
      );
    }

    const email = await sendEmailBatch(
      recipients
        .filter((r) => r.verifiedEmail)
        .map((r) => ({
          to: r.verifiedEmail!,
          subject: PUSH_TEXT[step.kind]('', '').title,
          html: reminderEmail({ kind: step.kind, name: r.name, amount: amountById.get(r.id)!, dueLabel: label, appUrl }),
        })),
    );

    results.push({
      kind: step.kind,
      dueDate,
      recipients: recipients.length,
      push: push.ok,
      whatsapp: whatsapp.ok,
      whatsappSkipped,
      email: email.sent,
      failed: push.failed + whatsapp.failed + email.failed,
    });
  }
  return results;
}
