"use client";

/**
 * Editor toolbar — flow name / description, status chip, dirty
 * indicator, and the action buttons (Save, Activate/Pause, Delete,
 * View runs, Back).
 *
 * Restyled to the Flow Builder design handoff: a single compact
 * toolbar row (back · icon · inline-editable name · status chip ·
 * edited dot on the left; Runs · Delete · Activate · Save on the
 * right) followed by a subtle, full-width description "note" line.
 * Replaces the old three-row stack so the editor reads as one app
 * chrome bar above the canvas/list stage.
 *
 * Lifted out of flow-builder.tsx so the same toolbar renders above
 * both views in FlowEditorShell. Without this, canvas users had no
 * way to save without toggling to list view.
 *
 * Reads everything from the editor context (`useFlowEditor`) so it
 * stays in sync with whichever view is mutating state, and routes
 * router navigation locally (back to /flows, View runs to
 * /flows/[id]/runs) — those don't belong in the hook.
 */

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  ArrowLeft,
  CircleDot,
  History,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  Trash2,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/whatsapp/ui/button";
import { cn } from "@/lib/whatsapp/utils";
import {
  useFlowEditor,
  type BuilderState,
} from "./flow-editor-state";

export function EditorHeader() {
  const {
    flow,
    state,
    setState,
    dirty,
    saving,
    activating,
    canActivate,
    save,
    setStatus,
    deleteFlow,
  } = useFlowEditor();
  const guard = useUnsavedChangesGuard(dirty);
  const [confirm, setConfirm] = useState<null | "delete" | "activate" | "publish">(null);
  const isActive = state.status === "active";

  return (
    <div className="flex flex-col gap-1.5 px-6 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        {/* ---- left: back · icon · name · status · edited ---- */}
        <button
          type="button"
          onClick={() => guard.navigate("/whatsapp/flows")}
          title="Back to Flows"
          aria-label="Back to Flows"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
          <Workflow className="h-[18px] w-[18px]" />
        </span>
        <input
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          placeholder="Flow name"
          spellCheck={false}
          aria-label="Flow name"
          className="min-w-[120px] max-w-[340px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-bold leading-tight tracking-tight text-foreground outline-none transition-colors hover:bg-muted focus:border-primary focus:bg-transparent focus:shadow-[0_0_0_3px_var(--primary-soft)]"
        />
        <StatusChip status={state.status} />
        {dirty && (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-warning"
            title={isActive ? "Not live yet — publish to apply" : "Unsaved changes"}
            aria-live="polite"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {isActive ? "Unpublished changes" : "Unsaved"}
          </span>
        )}

        {/* ---- right: runs · delete · activate · save ---- */}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => guard.navigate(`/whatsapp/flows/${flow.id}/runs`)}
          >
            <History className="h-3.5 w-3.5" />
            Runs
            <span className="ml-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {flow.execution_count}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirm("delete")}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          {state.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setStatus("draft")}
              disabled={activating}
            >
              {activating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PauseCircle className="h-3.5 w-3.5" />
              )}
              Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm("activate")}
              disabled={activating || !canActivate}
              title={
                !canActivate
                  ? "Fix the issues below before activating"
                  : undefined
              }
            >
              {activating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              Activate
            </Button>
          )}
          <Button
            onClick={() => (isActive ? setConfirm("publish") : void save())}
            disabled={saving || !dirty}
            size="sm"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isActive ? "Publish changes" : dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete “${state.name || "this flow"}”?`}
        consequences={["End any conversations currently running through it", "Remove its run history"]}
        confirmLabel="Delete flow"
        destructive
        onConfirm={() => {
          setConfirm(null);
          void deleteFlow();
        }}
      />
      <ConfirmDialog
        open={confirm === "activate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Turn this flow on?"
        description="It will start replying to matching incoming WhatsApp messages straight away."
        confirmLabel="Activate"
        onConfirm={() => {
          setConfirm(null);
          void setStatus("active");
        }}
      />
      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Publish changes to a live flow?"
        description="This flow is active — people messaging you will get the new version immediately."
        confirmLabel="Publish changes"
        onConfirm={() => {
          setConfirm(null);
          void save();
        }}
      />
      <ConfirmDialog
        open={guard.open}
        onOpenChange={guard.setOpen}
        title="Leave without saving?"
        description="Your changes to this flow haven’t been saved."
        confirmLabel="Leave"
        destructive
        onConfirm={guard.proceed}
      />

      {/* ---- description note (subtle, inline-editable) ---- */}
      <input
        value={state.description}
        onChange={(e) =>
          setState((s) => ({ ...s, description: e.target.value }))
        }
        placeholder="Add a short description (internal — customers don't see this)"
        aria-label="Flow description"
        className="w-full max-w-[78ch] rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:bg-muted/50 focus:border-primary focus:bg-transparent focus:text-foreground"
      />
    </div>
  );
}

function StatusChip({ status }: { status: BuilderState["status"] }) {
  const cfg = {
    draft: {
      // Neutral, not amber — amber is reserved for the adjacent
      // "Edited" dirty signal, so the two don't read as the same alert.
      cls: "border-border bg-muted text-muted-foreground",
      label: "Draft",
    },
    active: {
      cls: "border-success/30 bg-success-soft text-success",
      label: "Active",
    },
    archived: {
      cls: "border-border bg-muted/50 text-muted-foreground",
      label: "Archived",
    },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium",
        cfg.cls,
      )}
    >
      <CircleDot className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
