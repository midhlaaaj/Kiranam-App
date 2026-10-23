"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { createClient } from "@/lib/whatsapp/supabase/client"
import type {
  Automation,
  AutomationLog,
  AutomationLogStepResult,
} from "@/types/whatsapp"
import { Button } from "@/components/whatsapp/ui/button"
import { Skeleton, SkeletonRegion } from "@/components/whatsapp/ui/skeleton"
import { stepLabel, triggerEventLabel } from "@/lib/whatsapp/automations/labels"
import { cn } from "@/lib/whatsapp/utils"
import { formatRelative } from "@/lib/whatsapp/automations/trigger-meta"

export default function AutomationLogsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations("Automations.logs")

  const [automation, setAutomation] = useState<Automation | null>(null)
  const [logs, setLogs] = useState<AutomationLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openLogId, setOpenLogId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const [autRes, logRes] = await Promise.all([
          supabase
            .from("automations")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("automation_logs")
            .select("*, contact:contacts(id, name, phone)")
            .eq("automation_id", id)
            .order("created_at", { ascending: false })
            .limit(100),
        ])
        if (autRes.error) throw autRes.error
        if (logRes.error) throw logRes.error
        setAutomation(autRes.data as Automation | null)
        setLogs((logRes.data ?? []) as AutomationLog[])
      } catch (err) {
        setError(err instanceof Error ? err.message : t("loadError"))
      }
    }
    load()
    // `t` (next-intl) gets a new reference every render — only used here
    // for an error-message string, not worth retriggering the fetch over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button variant="outline" onClick={() => router.push("/whatsapp/automations")}>
          {t("back")}
        </Button>
      </div>
    )
  }

  if (logs === null) {
    return (
      <SkeletonRegion label="Loading automation history" className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-elevation-md">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="h-3 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </SkeletonRegion>
    )
  }

  // Loaded, but there is no such automation (deleted, or not yours): say so
  // instead of leaving the skeleton up forever.
  if (!automation) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
        <Button variant="outline" onClick={() => router.push("/whatsapp/automations")}>
          {t("back")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/whatsapp/automations")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("backAria")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{automation.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("title")}</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40">
          <p className="text-sm text-foreground">{t("emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("emptyDesc")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => {
            const isOpen = openLogId === log.id
            return (
              <li
                key={log.id}
                className="rounded-lg border border-border bg-card shadow-elevation-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenLogId(isOpen ? null : log.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <StatusBadge status={log.status} t={t} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {log.contact?.name ?? log.contact?.phone ?? t("unknownContact")}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {triggerEventLabel(log.trigger_event)} · {log.steps_executed?.length ?? 0}{" "}
                      {log.steps_executed?.length === 1 ? t("step", { count: 1 }).replace("1 ", "") : t("stepPlural", { count: log.steps_executed?.length ?? 0 }).replace(/^[0-9]+ /, "")}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelative(log.created_at)}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3">
                    {log.error_message && (
                      <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground">
                        {log.error_message}
                      </p>
                    )}
                    <ul className="space-y-1.5">
                      {(log.steps_executed ?? []).map((r, i) => (
                        <StepRow key={i} result={r} />
                      ))}
                      {(log.steps_executed ?? []).length === 0 && (
                        <li className="text-xs text-muted-foreground">{t("noSteps")}</li>
                      )}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function StatusBadge({ status, t }: { status: AutomationLog["status"], t: ReturnType<typeof useTranslations> }) {
  const classes =
    status === "success"
      ? "border-success/20 bg-success-soft text-success"
      : status === "partial"
      ? "border-warning/25 bg-warning-soft text-warning"
      : "border-destructive/20 bg-destructive/10 text-destructive"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs sm:text-[11px] font-medium",
        classes,
      )}
    >
      {t(`status.${status}`)}
    </span>
  )
}

function StepRow({ result }: { result: AutomationLogStepResult }) {
  const ok = result.status === "success"
  return (
    <li className="flex items-start gap-2 text-xs">
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
          ok ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive",
        )}
        aria-hidden
      >
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className="text-foreground">{stepLabel(result.step_type)}</span>
      {result.detail && (
        <span className="truncate text-muted-foreground">— {result.detail}</span>
      )}
    </li>
  )
}
