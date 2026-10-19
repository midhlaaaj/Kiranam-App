"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTranslations } from "next-intl";

import { FlowEditorShell } from "@/components/whatsapp/flows/flow-editor-shell";
import { FlowEditorSkeleton } from "@/components/whatsapp/flows/editor-skeleton";
import type { FlowRow, FlowNodeRow } from "@/lib/whatsapp/flows/types";

/**
 * Flow editor shell.
 *
 * Loads `{flow, nodes}` from `/api/whatsapp/flows/[id]` and hands it to
 * `<FlowBuilder>`. Owns the loading/error state so the builder can
 * focus purely on editing.
 *
 * Open to every authenticated user — the beta gate that previously
 * 404'd non-beta accounts was removed in PR #134. The API still
 * 404s on a flow id the caller doesn't own (RLS), which becomes the
 * "Flow not found" state below.
 */
export default function FlowEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const t = useTranslations("Flows.edit");
  const tList = useTranslations("Flows.list");

  const [flow, setFlow] = useState<FlowRow | null>(null);
  const [nodes, setNodes] = useState<FlowNodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/whatsapp/flows/${params.id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = (await res.json()) as {
          flow: FlowRow;
          nodes: FlowNodeRow[];
        };
        if (!cancelled) {
          setFlow(json.flow);
          setNodes(json.nodes ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error(t("loadError"));
          // A failed load is not "flow not found" - offer a retry instead.
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `t` (next-intl) gets a new reference every render — only used here
    // for an error-message string, not worth retriggering the fetch over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, reloadKey]);

  if (loading) return <FlowEditorSkeleton />;
  if (loadFailed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{t("loadError")}</p>
        <button
          type="button"
          onClick={() => {
            setLoadFailed(false);
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
          className="text-sm text-primary hover:opacity-80"
        >
          {tList("retry")}
        </button>
      </div>
    );
  }
  if (notFound || !flow) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <button
          type="button"
          onClick={() => router.push("/whatsapp/flows")}
          className="text-sm text-primary hover:opacity-80"
        >
          {t("backToFlows")}
        </button>
      </div>
    );
  }

  return <FlowEditorShell initialFlow={flow} initialNodes={nodes} />;
}
