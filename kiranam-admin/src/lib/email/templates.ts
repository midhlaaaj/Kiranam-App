// Shared visual system for Kiranam emails sent via Resend's API from this
// app (admin invite). The payment receipt email
// uses the same design but lives in the send-receipt-email Supabase Edge
// Function instead — a separate Deno deployment that can't import from
// here. Table-based markup — not flexbox/divs — because Outlook's
// rendering engine (Word, not a real browser) ignores most modern CSS;
// tables are the one layout approach that actually renders consistently
// everywhere.
const BRAND_RED = '#EC2028';
const INK = '#0C0C0D';
const MUTED = '#7A756E';
const BORDER = '#F1EEEA';
const BG = '#EEF0F1';

const wrapper = (bodyHtml: string, preheader = '') => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kiranam</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
    ${preheader ? `<div style="display none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BG}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">
            <tr>
              <td style="padding: 8px 4px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: ${INK}; letter-spacing: -0.5px;">Kiranam</span>
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
                  Kiranam &middot; <a href="mailto:support@kiranam.online" style="color: ${MUTED};">support@kiranam.online</a>
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

const heading = (text: string) => `<h1 style="font-size: 20px; line-height: 26px; color: ${INK}; margin: 0 0 12px; font-weight: 700;">${text}</h1>`;

const paragraph = (html: string) => `<p style="color: ${MUTED}; font-size: 14px; line-height: 22px; margin: 0 0 16px;">${html}</p>`;

const button = (href: string, label: string) => `
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

const fallbackLinkNote = (href: string) => `
  <p style="color: ${MUTED}; font-size: 12px; line-height: 18px; margin: 0 0 4px;">
    Or paste this link into your browser:
  </p>
  <p style="color: ${MUTED}; font-size: 12px; line-height: 18px; margin: 0 0 20px; word-break: break-all;">
    <a href="${href}" style="color: ${BRAND_RED};">${href}</a>
  </p>
`;

const disclaimerNote = () => `
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
