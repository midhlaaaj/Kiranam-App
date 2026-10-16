const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file content. */
  content: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

// Same provider as the mobile app's send-receipt-email Edge Function —
// kept as one Resend account/domain rather than introducing a second
// transactional provider just for kiranam-admin's own emails.
export async function sendEmail(params: EmailMessage): Promise<{ error: string | null }> {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.error('sendEmail: RESEND_API_KEY or EMAIL_FROM not configured');
    return { error: 'Email is not configured yet' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Resend send failed:', errText);
    return { error: 'Could not send email' };
  }
  return { error: null };
}

// Resend's batch endpoint takes up to 100 emails per call (no attachments).
const BATCH_LIMIT = 100;

/** Sends many emails via Resend's batch API. Returns how many were accepted. */
export async function sendEmailBatch(messages: Omit<EmailMessage, 'attachments'>[]): Promise<{ sent: number; failed: number }> {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.error('sendEmailBatch: RESEND_API_KEY or EMAIL_FROM not configured');
    return { sent: 0, failed: messages.length };
  }

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
    const chunk = messages.slice(i, i + BATCH_LIMIT);
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(chunk.map((m) => ({ from: EMAIL_FROM, to: m.to, subject: m.subject, html: m.html }))),
    });
    if (res.ok) {
      sent += chunk.length;
    } else {
      failed += chunk.length;
      console.error('Resend batch send failed:', await res.text());
    }
  }
  return { sent, failed };
}
