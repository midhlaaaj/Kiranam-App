'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Gauge } from 'lucide-react'
import { SummaryCardSkeleton } from './summary-card-skeleton'

interface LimitsResponse {
  cap: number | null
  reserve: number
  effectiveReserve: number
  messagedLast24h: number
  otpsLast24h: number
  remaining: number | null
  metaTier: string | null
  metaLimit: number | null
}

const fmt = (n: number) => n.toLocaleString('en-IN')

/**
 * Dashboard summary of today's WhatsApp sending allowance. The full settings
 * (daily limit, reserve for login codes, automatic next-day sending) live on
 * their own page — the whole card links there.
 */
export function LimitsCard() {
  const [data, setData] = useState<LimitsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/whatsapp/whatsapp/limits', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json()
        if (cancelled) return
        if (res.ok) setData(json)
        else setError(json.error || 'Not available yet.')
      })
      .catch(() => !cancelled && setError('Not available yet.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <SummaryCardSkeleton rows={0} label="Loading sending limits" />

  const broadcastBudget = data && data.cap !== null ? Math.max(0, data.cap - data.effectiveReserve) : null
  const used = data?.messagedLast24h ?? 0
  const pct = broadcastBudget ? Math.min(100, Math.round((used / broadcastBudget) * 100)) : 0

  return (
    <Link
      href="/whatsapp/sending-limits"
      className="group block rounded-lg border border-border bg-card p-5 shadow-elevation-md transition hover:border-foreground/30"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Gauge className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sending limits · last 24 hours</p>

          {!data ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
          ) : (
            <>
              <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {data.remaining === null ? 'No limit' : `${fmt(data.remaining)} left`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {fmt(used)} {used === 1 ? 'person' : 'people'} messaged by broadcasts
                {broadcastBudget !== null && <> of {fmt(broadcastBudget)}</>} · {fmt(data.otpsLast24h)} login{' '}
                {data.otpsLast24h === 1 ? 'code' : 'codes'}
              </p>
              {broadcastBudget !== null && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-1.5 rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
                </div>
              )}
            </>
          )}

          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
            Manage sending limits
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}
