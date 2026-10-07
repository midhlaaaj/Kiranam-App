"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/whatsapp/supabase/client";
import {
  CONVERSATION_SELECT,
  matchesContactFilters,
  normalizeConversations,
} from "@/lib/whatsapp/inbox/conversations";
import { cn } from "@/lib/whatsapp/utils";
import type { Conversation, ConversationStatus, Tag } from "@/types/whatsapp";
import { Search, ChevronDown, X } from "lucide-react";
import { useAuth } from "@/hooks/whatsapp/use-auth";
import { useTranslations } from "next-intl";
import { Input } from "@/components/whatsapp/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/whatsapp/ui/dropdown-menu";
import { ScrollArea } from "@/components/whatsapp/ui/scroll-area";

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  /**
   * Increment to force the fetch effect below to refire. The parent
   * bumps this on realtime reconnect / tab visibility → visible so the
   * list catches up on any events sent while the WS was disconnected
   * or the tab was throttled. Optional so existing callers keep working.
   */
  resyncToken?: number;
}

type InboxView = "all" | "mine" | "unassigned";

/** "2m" · "14:05" · "Yesterday" · "12 Mar" — compact, scannable list times. */
function compactTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const viewTabClass = (active: boolean) =>
  cn(
    "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
  );

const filterTriggerClass = (active: boolean) =>
  cn(
    "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors",
    active
      ? "border-foreground/40 bg-foreground/5 text-foreground"
      : "border-border text-muted-foreground hover:text-foreground",
  );

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  resyncToken = 0,
}: ConversationListProps) {
  const t = useTranslations("Inbox.conversationList");
  
  const { user, accountId } = useAuth();
  const STATUS_OPTIONS: { label: string; value: ConversationStatus }[] = useMemo(() => [
    { label: t("filterOpen"), value: "open" },
    { label: t("filterPending"), value: "pending" },
    { label: t("filterClosed"), value: "closed" },
  ], [t]);

  const [search, setSearch] = useState("");
  // Ownership view and status are separate dimensions (they used to share
  // one dropdown, so "Unread + Open" was impossible).
  const [view, setView] = useState<InboxView>("all");
  const [status, setStatus] = useState<ConversationStatus | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  // user_id → name, for the assignee chip on each row.
  const [agents, setAgents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  // Contact-based filters (issue #272). Tags use OR logic (a conversation
  // matches if its contact carries any selected tag), consistent with
  // Broadcast audience filtering. Company is an exact match on the field.
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  // Keep the latest callback in a ref so the fetch effect below can
  // have a stable, empty-dep identity. Previously the fetch useCallback
  // depended on `onConversationsLoaded`, which depends on the parent's
  // `deepLinkConvId` — so every URL change (including one the parent
  // triggered via router.replace after a click) caused a fresh
  // conversations fetch. That extra refetch was the trigger for the
  // deep-link auto-select running a second time and wiping the active
  // thread's messages.
  // Mutation lives in an effect (not render) per React 19's refs rule;
  // the fetch runs once on mount so it's fine to read the slightly
  // older value — the very next render updates the ref for any
  // subsequent async completion.
  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .order("last_message_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        // Supabase errors have non-enumerable properties — log fields explicitly
        console.error("Failed to fetch conversations:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      onConversationsLoadedRef.current(normalizeConversations(data ?? []));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // `resyncToken` is included so the parent can force a refetch when
    // the realtime channel reconnects or the tab regains focus — catches
    // up on any events sent while the WS was disconnected or throttled.
  }, [resyncToken]);

  // Tag definitions for the filter picker — loaded once so labels/colours
  // stay stable regardless of which conversations happen to be loaded.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      if (!cancelled && data) setTags(data as Tag[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    createClient()
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("account_id", accountId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setAgents(new Map(data.map((p) => [p.user_id as string, (p.full_name || p.email || "?") as string])));
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Company options are derived from the loaded conversations — there's no
  // separate companies table, and only companies with a live conversation
  // are worth offering as an inbox filter.
  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) {
      const co = c.contact?.company?.trim();
      if (co) set.add(co);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  const tagsById = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  const viewCounts = useMemo(() => {
    let mine = 0;
    let unassigned = 0;
    for (const c of conversations) {
      if (c.status === "closed") continue;
      if (!c.assigned_agent_id) unassigned++;
      else if (c.assigned_agent_id === user?.id) mine++;
    }
    return { mine, unassigned };
  }, [conversations, user?.id]);

  const filtered = useMemo(() => {
    let result = conversations;

    if (view === "mine") result = result.filter((c) => c.assigned_agent_id === user?.id);
    else if (view === "unassigned") result = result.filter((c) => !c.assigned_agent_id);
    if (status) result = result.filter((c) => c.status === status);
    if (unreadOnly) result = result.filter((c) => c.unread_count > 0);

    // Contact-based filters (tags via OR logic, exact company match).
    if (selectedTagIds.length > 0 || selectedCompany !== null) {
      result = result.filter((c) =>
        matchesContactFilters(c, {
          tagIds: selectedTagIds,
          company: selectedCompany,
        })
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    // Newest activity first — realtime updates patch rows in place, so
    // without this a thread with a new message stayed where it was.
    return [...result].sort(
      (a, b) => new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime(),
    );
  }, [conversations, view, status, unreadOnly, search, selectedTagIds, selectedCompany, user?.id]);

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedCompany(null);
    setStatus(null);
    setUnreadOnly(false);
    setSearch("");
  }, []);

  const hasFilters =
    selectedTagIds.length > 0 || selectedCompany !== null || status !== null || unreadOnly || !!search.trim();

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect]
  );


  return (
    // w-full on mobile so the list occupies the whole viewport when it's
    // the single pane showing; fixed 320px on desktop where it shares the
    // row with the thread + contact sidebar.
    <div className="flex h-full w-full flex-col border-r border-border bg-card lg:w-80">
      {/* Search + Filter */}
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-9 text-sm"
          />
        </div>

        <div role="tablist" aria-label="Conversation owner" className="flex gap-1 rounded-lg bg-muted p-1">
          {(["all", "mine", "unassigned"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={viewTabClass(view === v)}>
              {v === "all" ? t("viewAll") : v === "mine" ? t("viewMine") : t("viewUnassigned")}
              {v !== "all" && viewCounts[v] > 0 && (
                <span className="ml-1 tabular-nums text-muted-foreground">{viewCounts[v]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger className={filterTriggerClass(status !== null)}>
              {t("status")}: <span className="font-semibold">{status ? STATUS_OPTIONS.find((o) => o.value === status)?.label : t("statusAny")}</span>
              <ChevronDown className="h-3 w-3" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="border-border bg-popover">
              <DropdownMenuItem onClick={() => setStatus(null)} className={cn("text-sm", status === null && "font-semibold")}>
                {t("statusAny")}
              </DropdownMenuItem>
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn("text-sm", status === opt.value && "font-semibold")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly((u) => !u)}
            className={filterTriggerClass(unreadOnly)}
          >
            {t("unreadOnly")}
          </button>

          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className={filterTriggerClass(selectedTagIds.length > 0)}>
                {t("tags")}
                {selectedTagIds.length > 0 && <span className="font-semibold tabular-nums">· {selectedTagIds.length}</span>}
                <ChevronDown className="h-3 w-3" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 w-56 border-border bg-popover">
                {tags.map((tg) => (
                  <DropdownMenuCheckboxItem
                    key={tg.id}
                    checked={selectedTagIds.includes(tg.id)}
                    onCheckedChange={() => toggleTag(tg.id)}
                    className="text-sm text-popover-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tg.color }} aria-hidden />
                      <span className="truncate">{tg.name}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {companies.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(filterTriggerClass(!!selectedCompany), "max-w-40")}>
                <span className="truncate">{selectedCompany ?? t("company")}</span>
                <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 w-56 border-border bg-popover">
                <DropdownMenuItem onClick={() => setSelectedCompany(null)} className={cn("text-sm", selectedCompany === null && "font-semibold")}>
                  {t("allCompanies")}
                </DropdownMenuItem>
                {companies.map((co) => (
                  <DropdownMenuItem key={co} onClick={() => setSelectedCompany(co)} className={cn("text-sm", selectedCompany === co && "font-semibold")}>
                    <span className="truncate">{co}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {hasFilters && (
            <button type="button" onClick={clearAllFilters} className="inline-flex h-8 items-center px-1.5 text-xs font-semibold text-foreground underline-offset-2 hover:underline">
              {t("clearAll")}
            </button>
          )}
        </div>

        {selectedTagIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {selectedTagIds.map((id) => {
              const tag = tagsById.get(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleTag(id)}
                  aria-label={`Remove tag filter ${tag?.name ?? ""}`}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-muted px-2 text-xs text-foreground hover:bg-muted/70"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag?.color ?? "var(--muted-foreground)" }} aria-hidden />
                  <span className="max-w-24 truncate">{tag?.name ?? t("tags")}</span>
                  <X className="h-3 w-3" aria-hidden />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Conversation Items.
          `min-h-0` is load-bearing: a flex child defaults to
          min-height:auto, so without it this ScrollArea grows to fit
          every conversation instead of shrinking to the remaining
          space — the list then overflows and gets clipped by the
          parent's overflow-hidden with no scrollbar (issue #229). */}
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div aria-busy="true" aria-label="Loading conversations">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            {conversations.length === 0 ? (
              <>
                <p className="text-sm font-medium text-foreground">{t("noConversations")}</p>
                <p className="text-xs text-muted-foreground">{t("noConversationsHint")}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">{t("noMatches")}</p>
                {(hasFilters || view !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAllFilters();
                      setView("all");
                    }}
                    className="text-xs font-semibold text-foreground underline underline-offset-2"
                  >
                    {t("clearFilters")}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
                assigneeName={conv.assigned_agent_id ? agents.get(conv.assigned_agent_id) ?? null : null}
                isMine={!!conv.assigned_agent_id && conv.assigned_agent_id === user?.id}
                t={t}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
  assigneeName: string | null;
  isMine: boolean;
  t: ReturnType<typeof useTranslations>;
}

function ConversationItem({ conversation, isActive, onSelect, assigneeName, isMine, t }: ConversationItemProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || t("unknown");
  const initials = displayName.charAt(0).toUpperCase();
  const unread = conversation.unread_count > 0;

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  // Media messages have no text — say so rather than "No messages yet".
  const preview =
    conversation.last_message_text ||
    (conversation.last_message_at ? t("attachment") : t("noMessagesYet"));

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 border-l-2 px-3 py-3 text-left transition-colors hover:bg-muted/50",
        isActive ? "border-primary bg-muted/70" : "border-transparent",
      )}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
        {contact?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contact.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm text-foreground", unread ? "font-bold" : "font-medium")}>{displayName}</span>
          {conversation.last_message_at && (
            <time
              dateTime={conversation.last_message_at}
              className={cn("shrink-0 text-xs tabular-nums", unread ? "font-semibold text-foreground" : "text-muted-foreground")}
            >
              {compactTime(conversation.last_message_at)}
            </time>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>{preview}</p>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold tabular-nums text-primary-foreground">
              <span className="sr-only">Unread messages: </span>
              {conversation.unread_count}
            </span>
          )}
        </div>
        {(conversation.status !== "open" || assigneeName) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {conversation.status !== "open" && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {conversation.status === "pending" ? t("statusPending") : t("statusClosed")}
              </span>
            )}
            {assigneeName && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                title={t("assignedTo", { name: assigneeName })}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground/10 text-[9px] font-bold text-foreground" aria-hidden>
                  {assigneeName.charAt(0).toUpperCase()}
                </span>
                {isMine ? t("viewMine") : assigneeName.split(" ")[0]}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
