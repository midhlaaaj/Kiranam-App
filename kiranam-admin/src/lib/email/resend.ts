const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

// Same provider as the mobile app's send-receipt-email Edge Function —
// kept as one Resend account/domain rather than introducing a second
// transactional provider just for kiranam-admin's own emails.
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<{ error: string | null }> {
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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Resend send failed:', errText);
    return { error: 'Could not send email' };
  }
  return { error: null };
}
