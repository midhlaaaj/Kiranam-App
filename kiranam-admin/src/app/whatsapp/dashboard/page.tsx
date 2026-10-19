"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/whatsapp/supabase/client'
import {
  MessageSquare,
  MessageSquarePlus,
  Send,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/whatsapp/ui/button'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadResponseTime,
} from '@/lib/whatsapp/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  ResponseTimeSummary,
} from '@/lib/whatsapp/dashboard/types'

import { MetricCard } from '@/components/whatsapp/dashboard/metric-card'
import { SkeletonCard } from '@/components/whatsapp/ui/skeleton'
import { UsageCard } from '@/components/whatsapp/dashboard/usage-card'
import { LimitsCard } from '@/components/whatsapp/dashboard/limits-card'
import { QuickActions } from '@/components/whatsapp/dashboard/quick-actions'
import { ConversationsChart } from '@/components/whatsapp/dashboard/conversations-chart'
import { ResponseTimeChart } from '@/components/whatsapp/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/whatsapp/dashboard/activity-feed'

import { useTranslations } from 'next-intl'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  // Keep a cache per range so switching tabs doesn't re-fetch what we
  // already have. Ranges the user hasn't opened yet stay null and
  // trigger a fetch on first view.
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [seriesError, setSeriesError] = useState<Record<RangeDays, boolean>>({ 7: false, 30: false, 90: false })

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)
  const [responseTimeError, setResponseTimeError] = useState(false)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState(false)

  const [metricsError, setMetricsError] = useState(false)
  const retryMetrics = useCallback(() => {
    setMetricsError(false)
    setMetricsLoading(true)
    loadMetrics(createClient())
      .then((m) => setMetrics(m))
      .catch(() => setMetricsError(true))
      .finally(() => setMetricsLoading(false))
  }, [])

  const fetchSeries = useCallback((r: RangeDays) => {
    setSeriesLoading(true)
    setSeriesError((prev) => ({ ...prev, [r]: false }))
    loadConversationsSeries(createClient(), r)
      .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
      .catch((err) => {
        console.error('[dashboard] series failed:', err)
        setSeriesError((prev) => ({ ...prev, [r]: true }))
      })
      .finally(() => setSeriesLoading(false))
  }, [])

  const fetchResponseTime = useCallback(() => {
    setResponseTimeLoading(true)
    setResponseTimeError(false)
    loadResponseTime(createClient())
      .then((r) => setResponseTime(r))
      .catch((err) => {
        console.error('[dashboard] response time failed:', err)
        setResponseTimeError(true)
      })
      .finally(() => setResponseTimeLoading(false))
  }, [])

  const fetchActivity = useCallback(() => {
    setActivityLoading(true)
    setActivityError(false)
    // Fetch up to 50 so the biggest page-size option in the feed
    // (50 rows) is already in memory — switching sizes then becomes
    // a pure client-side slice with no extra round trip.
    loadActivity(createClient(), 50)
      .then((a) => setActivity(a))
      .catch((err) => {
        console.error('[dashboard] activity failed:', err)
        setActivityError(true)
      })
      .finally(() => setActivityLoading(false))
  }, [])

  const loadAll = useCallback(() => {
    const db = createClient()

    // Kick everything off in parallel. Each block has its own
    // setState + finally so a slow query doesn't hold up faster
    // sections — each widget shows its own skeleton independently.
    void loadMetrics(db)
      .then((m) => {
        setMetrics(m)
        setMetricsError(false)
      })
      .catch((err) => {
        console.error('[dashboard] metrics failed:', err)
        setMetricsError(true)
      })
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => {
        console.error('[dashboard] series failed:', err)
        setSeriesError((prev) => ({ ...prev, 30: true }))
      })
      .finally(() => setSeriesLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => {
        console.error('[dashboard] response time failed:', err)
        setResponseTimeError(true)
      })
      .finally(() => setResponseTimeLoading(false))

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => {
        console.error('[dashboard] activity failed:', err)
        setActivityError(true)
      })
      .finally(() => setActivityLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Range switch handler — kept in an event callback (not an effect)
  // so the setState calls stay out of the react-hooks/set-state-in-effect
  // rule's way. The cached bucket check means switching back to a
  // previously-viewed range is instant and doesn't re-fetch.
  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      fetchSeries(r)
    },
    [series, fetchSeries],
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricsError ? (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card shadow-elevation-md p-4 sm:col-span-2 xl:col-span-4">
            <p className="text-sm text-foreground">{t('metricsError')}</p>
            <Button variant="outline" size="sm" onClick={retryMetrics}>
              {t('retry')}
            </Button>
          </div>
        ) : metricsLoading || !metrics ? (
          <>
            <span role="status" className="sr-only">
              Loading metrics
            </span>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title={t('openConversations')}
              value={metrics.openConversations.toLocaleString()}
              icon={MessageSquare}
              subtitle={t('unassigned', { count: metrics.unassignedOpen })}
            />
            <MetricCard
              title={t('newConversationsToday')}
              value={metrics.newConversations.current.toLocaleString()}
              icon={MessageSquarePlus}
              delta={{
                sign: metrics.newConversations.current - metrics.newConversations.previous,
                label: deltaLabel(
                  metrics.newConversations.current - metrics.newConversations.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('newContactsToday')}
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('messagesSentToday')}
              value={metrics.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign:
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
          </>
        )}
      </div>

      {/* Own fetch/loading cycles, independent of the metrics above. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UsageCard />
        <LimitsCard />
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Conversations chart — full width now that the Pipeline donut
          (a Deals-feature widget, removed along with Pipelines/Deals)
          no longer shares this row. */}
      <ConversationsChart
        series={series}
        loading={seriesLoading}
        error={seriesError[range]}
        onRetry={() => fetchSeries(range)}
        range={range}
        onRangeChange={handleRangeChange}
      />

      {/* Response time */}
      <ResponseTimeChart
        data={responseTime}
        loading={responseTimeLoading}
        error={responseTimeError}
        onRetry={fetchResponseTime}
      />

      {/* Activity feed */}
      <ActivityFeed items={activity} loading={activityLoading} error={activityError} onRetry={fetchActivity} />
    </div>
  )
}

// ------------------------------------------------------------

function deltaLabel(delta: number, suffix: string, noChangeLabel: string): string {
  if (delta === 0) return noChangeLabel
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
