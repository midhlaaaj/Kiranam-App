import type { AutomationTriggerType } from '@/types/whatsapp'

export interface TriggerMeta {
  label: string
  /** Tailwind classes for the Badge pill on the list row. */
  pillClass: string
}

// One neutral pill style — eight hues (several failing contrast in light
// mode) added noise without meaning; the label carries the information.
const NEUTRAL_PILL = 'border-border bg-muted text-foreground'

const TRIGGER_META: Record<AutomationTriggerType, TriggerMeta> = {
  new_message_received: {
    label: 'Any new message',
    pillClass: NEUTRAL_PILL,
  },
  first_inbound_message: {
    label: 'First message from someone',
    pillClass: NEUTRAL_PILL,
  },
  keyword_match: {
    label: 'Message contains a keyword',
    pillClass: NEUTRAL_PILL,
  },
  new_contact_created: {
    label: 'New contact added',
    pillClass: NEUTRAL_PILL,
  },
  conversation_assigned: {
    label: 'Conversation assigned',
    pillClass: NEUTRAL_PILL,
  },
  tag_added: {
    label: 'Tag added',
    pillClass: NEUTRAL_PILL,
  },
  time_based: {
    label: 'On a schedule',
    pillClass: NEUTRAL_PILL,
  },
  interactive_reply: {
    label: 'Button or list reply',
    pillClass: NEUTRAL_PILL,
  },
}

export function triggerMeta(t: AutomationTriggerType | string): TriggerMeta {
  return (
    TRIGGER_META[t as AutomationTriggerType] ?? {
      label: t,
      pillClass: NEUTRAL_PILL,
    }
  )
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'never'
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 2_592_000) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
