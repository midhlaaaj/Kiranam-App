import { recordOutboundTemplate } from '@/lib/whatsapp/whatsapp/record-outbound'
import { sendTemplateMessage } from '@/lib/whatsapp/whatsapp/meta-api'
import type { SendTimeParams } from '@/lib/whatsapp/whatsapp/template-send-builder'
import type { MessageTemplate } from '@/types/whatsapp'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/whatsapp/phone-utils'

/** "₹{{2}}" in the template body + a value that already starts with "₹" would
 * send "₹₹100" — drop the value's own sign wherever the body supplies one. */
export function dropDuplicateRupeeSigns(bodyText: string | undefined, values: string[]): string[] {
  if (!bodyText) return values
  return values.map((value, i) => {
    const placeholder = new RegExp(String.raw`₹\s*\{\{\s*${i + 1}\s*\}\}`)
    return placeholder.test(bodyText) ? value.replace(/^\s*₹\s*/, '') : value
  })
}

export type BroadcastSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

/**
 * Sends one template message to one phone, retrying phone-number variants
 * (e.g. a trunk-prefix 0) when Meta says the number isn't in the allowed
 * list. Shared by the broadcast API route and the server-side auto-resume
 * job so both behave identically.
 */
export async function sendBroadcastMessage(opts: {
  phoneNumberId: string
  accessToken: string
  phone: string
  templateName: string
  language: string
  template: MessageTemplate | null
  params: string[]
  messageParams?: SendTimeParams
  /** When set, a successful send is also saved to the recipient's inbox thread. */
  inboxAccountId?: string
}): Promise<BroadcastSendResult> {
  const sanitized = sanitizePhoneForMeta(opts.phone)
  if (!isValidE164(sanitized)) return { ok: false, error: 'Invalid phone number format' }

  const bodyText = opts.template?.body_text
  const params = dropDuplicateRupeeSigns(bodyText, opts.params)
  const messageParams = opts.messageParams?.body
    ? { ...opts.messageParams, body: dropDuplicateRupeeSigns(bodyText, opts.messageParams.body) }
    : opts.messageParams

  let lastError: string | null = null
  for (const variant of phoneVariants(sanitized)) {
    try {
      const result = await sendTemplateMessage({
        phoneNumberId: opts.phoneNumberId,
        accessToken: opts.accessToken,
        to: variant,
        templateName: opts.templateName,
        language: opts.language,
        template: opts.template ?? undefined,
        messageParams,
        params,
      })
      if (opts.inboxAccountId) {
        await recordOutboundTemplate({
          accountId: opts.inboxAccountId,
          phone: variant,
          templateName: opts.templateName,
          template: opts.template,
          params,
          messageParams,
          waMessageId: result.messageId,
        })
      }
      return { ok: true, messageId: result.messageId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      lastError = message
      if (!isRecipientNotAllowedError(message)) break
    }
  }
  return { ok: false, error: lastError || 'Unknown error' }
}
