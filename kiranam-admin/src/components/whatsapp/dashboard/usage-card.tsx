'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { SummaryCardSkeleton } from './summary-card-skeleton'

interface CategoryTotal {
  category: string
  conversations: number
  cost: number
}

interface UsageResponse {
  available: boolean
  reason?: string
  message?: string
  days?: number
  currency?: string | null
  totalConversations?: number
  totalCost?: number
  byCategory?: CategoryTotal[]
}

const TITLE = 'WhatsApp spend · last 7 days'

const CATEGORY_LABEL: Record<string, string> = {
  authentication: 'Authentication (OTP)',
  marketing: 'Marketing',
  utility: 'Utility',
  service: 'Service',
  unknown: 'Other',
}

/**
 * Billable message volume + spend over the trailing week, pulled from
 * Meta's Pricing Analytics API. Not a "balance" — the Cloud API
 * bills per message to the linked payment method rather than
 * drawing down a prepaid credit — so this card shows usage/spend
 * instead, which is the closest equivalent available.
 */
export function UsageCard() {
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/whatsapp/whatsapp/usage?days=7')
      .then((res) => res.json())
      .then((json: UsageResponse) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        console.error('[dashboard] usage failed:', err)
        if (!cancelled) setData({ available: false, reason: 'unknown' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <SummaryCardSkeleton rows={2} label="Loading WhatsApp spend" />

  if (!data?.available) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-elevation-md p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Wallet className="h-[18px] w-[18px]" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{TITLE}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{data?.message ?? 'Not available yet.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { totalConversations = 0, totalCost = 0, currency, byCategory = [] } = data

  // Full-width card: the headline on the left, the per-category breakdown on
  // the right, so it lines up with the four metric cards above instead of
  // being a taller, narrower fifth card.
  return (
    <div className="rounded-lg border border-border bg-card shadow-elevation-md p-5">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Wallet className="h-[18px] w-[18px]" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{TITLE}</p>
            {/* Spend is the headline — that's what this card exists for. */}
            <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {currency ? formatCost(totalCost, currency) : totalConversations.toLocaleString('en-IN')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalConversations.toLocaleString('en-IN')} billable {totalConversations === 1 ? 'message' : 'messages'} · paid to Meta ·{' '}
              <a
                href="https://business.facebook.com/billing_hub/accounts"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                View billing ↗
              </a>
            </p>
          </div>
        </div>

        {byCategory.length > 0 && (
          <ul className="w-full divide-y divide-border border-t border-border pt-3 text-sm">
            {[...byCategory]
              .sort((a, b) => b.conversations - a.conversations)
              .map((c) => (
                <li key={c.category} className="flex items-center justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
                  <span className="text-muted-foreground">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <span className="tabular-nums text-foreground">
                    {c.conversations.toLocaleString('en-IN')} {c.conversations === 1 ? 'message' : 'messages'}
                    {currency ? ` · ${formatCost(c.cost, currency)}` : ''}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function formatCost(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
  } catch {
    // Unknown/unsupported currency code — fall back to a plain number.
    return `${amount.toFixed(2)} ${currency}`
  }
}
