"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { AutomationBuilderSkeleton } from "@/components/whatsapp/automations/builder-skeleton"
import {
  AutomationBuilder,
  fromServerSteps,
  type BuilderInitial,
  type ServerStepNode,
} from "@/components/whatsapp/automations/automation-builder"
import type { AutomationTriggerType } from "@/types/whatsapp"

export default function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations("Automations.edit")
  const [initial, setInitial] = useState<BuilderInitial | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      let res: Response
      try {
        res = await fetch(`/api/whatsapp/automations/${id}`)
      } catch {
        // Network failure — show the error state instead of skeleton forever.
        if (!cancelled) setError(t("loadError", { status: 0 }))
        return
      }
      if (!res.ok) {
        if (!cancelled) setError(t("loadError", { status: res.status }))
        return
      }
      const body = await res.json().catch(() => null)
      if (cancelled) return
      if (!body?.automation) {
        setError(t("loadError", { status: res.status }))
        return
      }
      setInitial({
        id: body.automation.id,
        name: body.automation.name ?? "",
        description: body.automation.description ?? "",
        trigger_type: body.automation.trigger_type as AutomationTriggerType,
        trigger_config: body.automation.trigger_config ?? {},
        is_active: !!body.automation.is_active,
        steps: fromServerSteps((body.steps ?? []) as ServerStepNode[]),
      })
    }
    load()
    return () => {
      cancelled = true
    }
    // `t` (next-intl) gets a new reference every render — only used here
    // for an error-message string, not worth retriggering the fetch over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => router.push("/whatsapp/automations")}
          className="text-sm text-primary hover:text-primary/80"
        >
          {t("back")}
        </button>
      </div>
    )
  }

  if (!initial) return <AutomationBuilderSkeleton />

  return <AutomationBuilder initial={initial} />
}
