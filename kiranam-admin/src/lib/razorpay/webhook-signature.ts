import crypto from 'node:crypto';

/**
 * Verify Razorpay's webhook signature: HMAC-SHA256 of the raw request
 * body, hex-encoded, keyed with the webhook secret configured in the
 * Razorpay Dashboard (Settings → Webhooks) — sent as `X-Razorpay-Signature`.
 * Simpler than Supabase's Standard Webhooks scheme (no id/timestamp
 * compound, no key-rotation list) but the same fail-closed, timing-safe
 * posture as `verifySupabaseHookSignature`.
 */
export function verifyRazorpayWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set — rejecting request.');
    return false;
  }
  if (!signatureHeader) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}
