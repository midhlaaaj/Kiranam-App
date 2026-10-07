/**
 * Shared status badge config for broadcasts + recipients.
 *
 * Previously `statusConfig` was defined inline in both
 * /broadcasts/page.tsx and /broadcasts/[id]/page.tsx with slight
 * drift risk. One source of truth now.
 *
 * Colors come from the semantic status tokens in globals.css, which are
 * defined per mode so they keep AA contrast in light and dark.
 */

import type { BroadcastStatus, RecipientStatus } from "@/types/whatsapp";

export interface StatusDisplay {
  label: string;
  classes: string;
  /**
   * Set true for statuses that should pulse in the UI to convey
   * "live / in-flight" — currently only `sending`.
   */
  pulse?: boolean;
}

// Semantic tokens only (success / warning / info / destructive) — never the
// brand primary, which would make "sent" and "failed" look alike.
const NEUTRAL = "bg-muted text-muted-foreground border-border";
const INFO = "bg-info-soft text-info border-info/20";
const WARNING = "bg-warning-soft text-warning border-warning/25";
const SUCCESS = "bg-success-soft text-success border-success/20";
const DANGER = "bg-destructive/10 text-destructive border-destructive/20";

export const broadcastStatusConfig: Record<BroadcastStatus, StatusDisplay> = {
  draft: { label: "draft", classes: NEUTRAL },
  scheduled: { label: "scheduled", classes: INFO },
  sending: { label: "sending", classes: WARNING, pulse: true },
  sent: { label: "sent", classes: SUCCESS },
  failed: { label: "failed", classes: DANGER },
};

export const recipientStatusConfig: Record<RecipientStatus, StatusDisplay> = {
  pending: { label: "pending", classes: NEUTRAL },
  sent: { label: "sent", classes: INFO },
  delivered: { label: "delivered", classes: SUCCESS },
  read: { label: "read", classes: SUCCESS },
  replied: { label: "replied", classes: SUCCESS },
  failed: { label: "failed", classes: DANGER },
};

/**
 * Tolerant lookup — callers often have a generic string status
 * coming from Supabase. Falls back to the "draft" / "pending"
 * entry so the UI never crashes on an unknown value.
 */
export function getBroadcastStatus(status: string): StatusDisplay {
  return (
    broadcastStatusConfig[status as BroadcastStatus] ??
    broadcastStatusConfig.draft
  );
}

export function getRecipientStatus(status: string): StatusDisplay {
  return (
    recipientStatusConfig[status as RecipientStatus] ??
    recipientStatusConfig.pending
  );
}
