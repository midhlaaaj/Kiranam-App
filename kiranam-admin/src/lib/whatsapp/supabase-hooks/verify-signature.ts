import crypto from 'node:crypto'

/**
 * Verify the Standard Webhooks signature Supabase Auth attaches to Auth
 * Hook requests (Send SMS Hook, Send Email Hook, etc).
 *
 * Spec: https://github.com/standard-webhooks/standard-webhooks
 * Signed content: `${webhook-id}.${webhook-timestamp}.${rawBody}`, HMAC-SHA256,
 * base64-encoded. The secret Supabase gives you is `v1,whsec_<base64>` — strip
 * the `v1,whsec_` prefix and base64-decode the rest to get the raw HMAC key.
 * The `webhook-signature` header can carry multiple space-separated
 * `v1,<base64sig>` entries (key rotation) — any match is accepted.
 *
 * Mirrors the fail-closed, constant-time-compare shape of
 * `verifyMetaWebhookSignature` in `src/lib/whatsapp/webhook-signature.ts` —
 * same posture, different spec.
 */

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60

export function verifySupabaseHookSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secretEnvVar = 'SEND_SMS_HOOK_SECRET',
): boolean {
  const secret = process.env[secretEnvVar]
  if (!secret) {
    console.error(`[send-sms-hook] ${secretEnvVar} is not set — rejecting request.`)
    return false
  }

  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  const skew = Math.abs(Date.now() / 1000 - timestampSeconds)
  if (skew > MAX_TIMESTAMP_SKEW_SECONDS) return false

  const prefix = 'v1,whsec_'
  if (!secret.startsWith(prefix)) {
    console.error(`[send-sms-hook] ${secretEnvVar} is not in the expected "v1,whsec_<base64>" format.`)
    return false
  }
  const key = Buffer.from(secret.slice(prefix.length), 'base64')

  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', key).update(signedContent).digest('base64')
  const expectedBuf = Buffer.from(expected)

  // webhook-signature can list multiple "v1,<sig>" entries space-separated.
  return signature
    .split(' ')
    .filter((entry) => entry.startsWith('v1,'))
    .some((entry) => {
      const candidate = Buffer.from(entry.slice('v1,'.length))
      if (candidate.length !== expectedBuf.length) return false
      return crypto.timingSafeEqual(candidate, expectedBuf)
    })
}
