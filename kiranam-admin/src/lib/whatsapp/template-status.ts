/**
 * Shared display config for message_templates.status.
 *
 * The DB stores Meta's raw enum (DRAFT / APPROVED / PENDING / REJECTED /
 * PAUSED / DISABLED / IN_APPEAL / PENDING_DELETION) — the UI maps it to
 * a human label + badge classes here so the template manager,
 * inbox picker, and broadcast picker stay aligned.
 */

import type { MessageTemplateStatus } from '@/types/whatsapp';

export interface TemplateStatusDisplay {
  label: string;
  classes: string;
}

// Semantic status tokens (globals.css) — never the brand primary, so
// "Approved" and "Rejected" can't read as the same red, and every badge
// keeps AA contrast in both light and dark mode.
const NEUTRAL = 'bg-muted text-muted-foreground border-border';
const INFO = 'bg-info-soft text-info border-info/20';
const WARNING = 'bg-warning-soft text-warning border-warning/25';
const SUCCESS = 'bg-success-soft text-success border-success/20';
const DANGER = 'bg-destructive/10 text-destructive border-destructive/20';

export const templateStatusConfig: Record<MessageTemplateStatus, TemplateStatusDisplay> = {
  DRAFT: { label: 'Draft', classes: NEUTRAL },
  PENDING: { label: 'Waiting for Meta', classes: WARNING },
  APPROVED: { label: 'Approved', classes: SUCCESS },
  REJECTED: { label: 'Rejected', classes: DANGER },
  PAUSED: { label: 'Paused by Meta', classes: WARNING },
  DISABLED: { label: 'Disabled', classes: DANGER },
  IN_APPEAL: { label: 'In appeal', classes: INFO },
  PENDING_DELETION: { label: 'Being deleted', classes: NEUTRAL },
};
