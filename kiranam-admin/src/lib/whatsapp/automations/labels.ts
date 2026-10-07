// Plain-language names for automation / flow internals shown in logs.
// Raw values ("send_message", "node_entered") are kept for unknown keys.

const STEP_LABEL: Record<string, string> = {
  send_message: 'Sent a message',
  send_template: 'Sent a template',
  send_buttons: 'Sent buttons',
  send_list: 'Sent a list',
  add_tag: 'Added a tag',
  remove_tag: 'Removed a tag',
  assign_conversation: 'Assigned the conversation',
  update_contact_field: 'Updated a contact field',
  wait: 'Waited',
  condition: 'Checked a condition',
  send_webhook: 'Called a webhook',
  close_conversation: 'Closed the conversation',
}

const TRIGGER_EVENT_LABEL: Record<string, string> = {
  new_message_received: 'New message',
  first_inbound_message: 'First message from someone',
  keyword_match: 'Keyword matched',
  new_contact_created: 'New contact added',
  conversation_assigned: 'Conversation assigned',
  tag_added: 'Tag added',
  time_based: 'Scheduled run',
  interactive_reply: 'Button or list reply',
}

const FLOW_EVENT_LABEL: Record<string, string> = {
  started: 'Started',
  node_entered: 'Moved to step',
  message_sent: 'Sent a message',
  reply_received: 'Got a reply',
  fallback_fired: "Didn't understand the reply",
  handoff: 'Handed to a person',
  timeout: 'Timed out waiting',
  error: 'Error',
  completed: 'Finished',
}

const humanize = (s: string) => {
  const t = s.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const stepLabel = (k: string) => STEP_LABEL[k] ?? humanize(k)
export const triggerEventLabel = (k: string) => TRIGGER_EVENT_LABEL[k] ?? humanize(k)
export const flowEventLabel = (k: string) => FLOW_EVENT_LABEL[k] ?? humanize(k)
/** Node keys are slugs ("ask_amount_2") — show them as words. */
export const nodeLabel = (k: string) => humanize(k.replace(/_\d+$/, ''))
