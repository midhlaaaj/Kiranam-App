'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { SkeletonCard } from './skeleton'

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

const CATEGORY_LABEL: Record<string, string> = {
  authentication: 'Authentication (OTP)',
  marketing: 'Marketing',
  utility: 'Utility',
  service: 'Service',
  unknown: 'Other',
}

/**
 * Conversation volume + spend over the trailing week, pulled from
 * Meta's Conversation Analytics API. Not a "balance" — the Cloud API
 * bills per-conversation to the linked payment method rather than
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

  if (loading) return <SkeletonCard />

  if (!data?.available) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            WhatsApp usage (7 days)
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {data?.message ?? 'Not available yet.'}
        </p>
      </div>
    )
  }

  const { totalConversations = 0, totalCost = 0, currency, byCategory = [] } = data

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          WhatsApp usage (last 7 days)
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Wallet className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-[28px] leading-none font-bold tabular-nums text-foreground">
        {totalConversations.toLocaleString()}{' '}
        <span className="text-base font-medium text-muted-foreground">conversations</span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {currency
          ? `${formatCost(totalCost, currency)} billed to your Meta Business Manager payment method`
          : 'Billed to your Meta Business Manager payment method'}
      </p>
      {byCategory.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          {byCategory
            .sort((a, b) => b.conversations - a.conversations)
            .map((c) => (
              <li key={c.category} className="flex items-center justify-between text-muted-foreground">
                <span>{CATEGORY_LABEL[c.category] ?? c.category}</span>
                <span className="tabular-nums text-foreground">
                  {c.conversations.toLocaleString()}
                  {currency ? ` · ${formatCost(c.cost, currency)}` : ''}
                </span>
              </li>
            ))}
        </ul>
      )}
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
