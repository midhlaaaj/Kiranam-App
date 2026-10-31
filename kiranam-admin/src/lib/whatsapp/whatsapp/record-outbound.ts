import { supabaseAdmin } from '@/lib/whatsapp/flows/admin-client'
import { resolveConversationByPhone } from '@/lib/whatsapp/whatsapp/resolve-conversation'
import type { SendTimeParams } from '@/lib/whatsapp/whatsapp/template-send-builder'
import type { MessageTemplate } from '@/types/whatsapp'

/**
 * Saves a template message that was sent straight through Meta's API
 * (broadcasts, receipts, reminders) into the recipient's inbox
 * conversation, so staff can see what each person was sent and replies
 * land in the same thread. Login codes deliberately don't use this.
 *
 * Best-effort: the message has already been delivered, so a failure
 * here is logged and swallowed rather than failing the send.
 */
export async function recordOutboundTemplate(opts: {
  accountId: string
  phone: string
  templateName: string
  template?: MessageTemplate | null
  params?: string[]
  messageParams?: SendTimeParams
  waMessageId: string
}): Promise<void> {
  try {
    const db = supabaseAdmin()
    const { conversationId } = await resolveConversationByPhone(db, opts.accountId, opts.phone)

    const values = opts.messageParams?.body ?? opts.params ?? []
    const text = opts.template?.body_text
      ? opts.template.body_text.replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) => values[Number(n) - 1] ?? m)
      : `[Template: ${opts.templateName}]`

    const { error } = await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'agent',
      content_type: 'template',
      content_text: text,
      template_name: opts.templateName,
      message_id: opts.waMessageId,
      status: 'sent',
    })
    if (error) throw error

    const now = new Date().toISOString()
    await db
      .from('conversations')
      .update({ last_message_text: text, last_message_at: now, updated_at: now })
      .eq('id', conversationId)
  } catch (err) {
    console.warn('[record-outbound] could not save sent template to inbox:', err instanceof Error ? err.message : err)
  }
}
