// Shared visual system for Kiranam emails sent via Resend's API from this
// app (admin invite). The payment receipt email
// uses the same design but lives in the send-receipt-email Supabase Edge
// Function instead — a separate Deno deployment that can't import from
// here. Table-based markup — not flexbox/divs — because Outlook's
// rendering engine (Word, not a real browser) ignores most modern CSS;
// tables are the one layout approach that actually renders consistently
// everywhere.
export const BRAND_RED = '#EC2028';
export const INK = '#0C0C0D';
export const MUTED = '#7A756E';
const BORDER = '#F1EEEA';
const BG = '#EEF0F1';

export const wrapper = (bodyHtml: string, preheader = '') => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Karunya Kiranam</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
    ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BG}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">
            <tr>
              <td style="padding: 8px 4px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: ${INK}; letter-spacing: -0.5px;">Karunya Kiranam</span>
                <div style="font-size: 13px; color: ${MUTED}; margin-top: 2px;">An initiative of Health Care Foundation</div>
                <div style="width: 36px; height: 3px; background: ${BRAND_RED}; border-radius: 2px; margin-top: 10px;"></div>
              </td>
            </tr>
            <tr>
              <td style="background: #FFFFFF; border-radius: 16px; padding: 32px; border: 1px solid ${BORDER};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 4px 0;">
                <p style="color: ${MUTED}; font-size: 12px; line-height: 18px; margin: 0;">
                  Karunya Kiranam &middot; An initiative of Health Care Foundation &middot; <a href="mailto:support@kiranam.online" style="color: ${MUTED};">support@kiranam.online</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const heading = (text: string) => `<h1 style="font-size: 20px; line-height: 26px; color: ${INK}; margin: 0 0 12px; font-weight: 700;">${text}</h1>`;

export const paragraph = (html: string) => `<p style="color: ${MUTED}; font-size: 14px; line-height: 22px; margin: 0 0 16px;">${html}</p>`;

export const button = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 20px;">
    <tr>
      <td style="background: ${BRAND_RED}; border-radius: 28px;">
        <a href="${href}" style="display: inline-block; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

export const fallbackLinkNote = (href: string) => `
  <p style="color: ${MUTED}; font-size: 12px; line-height: 18px; margin: 0 0 4px;">
    Or paste this link into your browser:
  </p>
  <p style="color: ${MUTED}; font-size: 12px; line-height: 18px; margin: 0 0 20px; word-break: break-all;">
    <a href="${href}" style="color: ${BRAND_RED};">${href}</a>
  </p>
`;

export const disclaimerNote = () => `
  <p style="color: ${MUTED}; font-size: 12px; line-height: 18px; margin: 0;">
    If you weren't expecting this email, you can safely ignore it — no changes will be made to any account.
  </p>
`;

export function adminInviteEmail(params: { signupUrl: string; invitedEmail: string; expiresAt: Date }) {
  const expiresLabel = params.expiresAt.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return wrapper(
    `
    ${heading("You've been invited to manage Kiranam")}
    ${paragraph(`Someone on the Kiranam team has invited <strong style="color: ${INK};">${params.invitedEmail}</strong> to help manage the Kiranam admin dashboard.`)}
    ${paragraph('Click below and sign up with this exact email address to set your password and get started.')}
    ${button(params.signupUrl, 'Accept Invite')}
    ${paragraph(`This invite expires on <strong style="color: ${INK};">${expiresLabel}</strong> — after that, ask an admin to resend it.`)}
    ${fallbackLinkNote(params.signupUrl)}
    ${disclaimerNote()}
    `,
    "You've been invited to manage Kiranam"
  );
}

export function passwordResetEmail(params: { resetUrl: string }) {
  return wrapper(
    `
    ${heading('Reset your password')}
    ${paragraph('We received a request to reset the password for your Kiranam admin account. Click below to choose a new one.')}
    ${button(params.resetUrl, 'Reset Password')}
    ${paragraph('This link expires in 1 hour and can only be used once.')}
    ${fallbackLinkNote(params.resetUrl)}
    ${disclaimerNote()}
    `,
    'Reset your Kiranam password'
  );
}

/** Escapes user-entered text (names, campaign titles) for HTML emails. */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const formatRupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function newCampaignEmail(params: {
  name: string;
  title: string;
  description: string;
  goal: number;
  coverUrl: string | null;
  appUrl: string;
}) {
  const cover = params.coverUrl
    ? `<img src="${escapeHtml(params.coverUrl)}" alt="" width="416" style="display: block; width: 100%; max-width: 416px; height: auto; border-radius: 12px; margin: 0 0 20px;" />`
    : '';
  return wrapper(
    `
    ${cover}
    ${heading(`A new campaign: ${escapeHtml(params.title)}`)}
    ${paragraph(`Hi ${escapeHtml(params.name)}, a new campaign has started on Karunya Kiranam.`)}
    ${params.description ? paragraph(escapeHtml(params.description).replace(/\n/g, '<br />')) : ''}
    ${paragraph(`Target: <strong style="color: ${INK};">${formatRupees(params.goal)}</strong>. Every contribution counts.`)}
    ${button(params.appUrl, 'Support this campaign')}
    `,
    `A new campaign has started: ${escapeHtml(params.title)}`
  );
}

export type ReminderKind = 'upcoming' | 'due_today' | 'overdue';

export function reminderEmail(params: { kind: ReminderKind; name: string; amount: number; dueLabel: string; appUrl: string }) {
  const amount = `<strong style="color: ${INK};">${formatRupees(params.amount)}</strong>`;
  const name = escapeHtml(params.name);
  const copy = {
    upcoming: {
      title: 'Your monthly Kiranam is due soon',
      text: `Hi ${name}, a gentle reminder that your monthly Kiranam contribution of ${amount} is due on <strong style="color: ${INK};">${params.dueLabel}</strong>. You can pay anytime from the Karunya Kiranam app.`,
    },
    due_today: {
      title: 'Your monthly Kiranam is due today',
      text: `Hi ${name}, your monthly Kiranam contribution of ${amount} is due today. Please complete it from the Karunya Kiranam app.`,
    },
    overdue: {
      title: 'Your monthly Kiranam is pending',
      text: `Hi ${name}, your monthly Kiranam contribution of ${amount} (due ${params.dueLabel}) is still pending. If you've already paid, please ignore this email.`,
    },
  }[params.kind];
  return wrapper(
    `
    ${heading(copy.title)}
    ${paragraph(copy.text)}
    ${paragraph('Thank you for standing with families in need.')}
    ${button(params.appUrl, 'Open Karunya Kiranam')}
    `,
    copy.title
  );
}

export function paymentReceiptEmail(params: { name: string; amount: string; label: string; date: string; transactionId: string }) {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid ${BORDER}; color: ${MUTED}; font-size: 13px;">${label}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid ${BORDER}; color: ${INK}; font-size: 13px; font-weight: 600; text-align: right;">${escapeHtml(value)}</td>
    </tr>`;
  return wrapper(
    `
    ${heading('Thank you for your contribution')}
    ${paragraph(`Hi ${escapeHtml(params.name)}, we've received your contribution. Your receipt is attached to this email as a PDF.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 4px 0 20px;">
      ${row('Amount', params.amount)}
      ${row('For', params.label)}
      ${row('Date', params.date)}
      ${row('Transaction ID', params.transactionId)}
    </table>
    ${paragraph('Your kindness helps families get their monthly groceries.')}
    `,
    `Your Kiranam receipt for ${escapeHtml(params.amount)}`
  );
}
