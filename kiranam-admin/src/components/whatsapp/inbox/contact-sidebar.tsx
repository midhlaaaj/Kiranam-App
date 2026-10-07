"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ArrowUpRight, BanIcon, Check, Copy, Mail, Phone, Plus, StickyNote, Tag as TagIcon, X } from "lucide-react";
import { createClient } from "@/lib/whatsapp/supabase/client";
import { useAuth } from "@/hooks/whatsapp/use-auth";
import type { Contact, ContactNote, Tag } from "@/types/whatsapp";
import { Button } from "@/components/whatsapp/ui/button";
import { ScrollArea } from "@/components/whatsapp/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/whatsapp/ui/dropdown-menu";

interface ContactSidebarProps {
  contact: Contact | null;
}

interface KiranamContext {
  profileId: string;
  role: string | null;
  monthlyAmount: number | null;
  autopay: boolean | null;
  lastGift: { amount: number; at: string } | null;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function SectionLabel({ icon: Icon, children }: { icon: typeof TagIcon; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {children}
    </h4>
  );
}

export function ContactSidebar({ contact }: ContactSidebarProps) {
  const t = useTranslations("Inbox.sidebar");
  const tThread = useTranslations("Inbox.messageThread");
  const { accountId } = useAuth();

  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [kiranam, setKiranam] = useState<KiranamContext | null | undefined>(undefined);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;
    const supabase = createClient();
    const [notesRes, tagsRes, allTagsRes, linkRes] = await Promise.all([
      supabase.from("contact_notes").select("*").eq("contact_id", contact.id).order("created_at", { ascending: false }),
      supabase.from("contact_tags").select("id, tag_id, tags(*)").eq("contact_id", contact.id),
      supabase.from("tags").select("*").order("name"),
      supabase.from("contacts").select("kiranam_profile_id").eq("id", contact.id).maybeSingle(),
    ]);

    if (notesRes.data) setNotes(notesRes.data);
    if (allTagsRes.data) setAllTags(allTagsRes.data as Tag[]);
    if (tagsRes.data) {
      setTags(
        tagsRes.data
          .filter((ct: Record<string, unknown>) => ct.tags)
          .map((ct: Record<string, unknown>) => ({ ...(ct.tags as Tag), contact_tag_id: ct.id as string })),
      );
    }

    // Kiranam context for synced contacts: who they are to the charity.
    const profileId = (linkRes.data?.kiranam_profile_id as string | null) ?? null;
    if (!profileId) {
      setKiranam(null);
      return;
    }
    const [profileRes, commitmentRes, giftRes] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", profileId).maybeSingle(),
      supabase.from("commitments").select("monthly_amount, autopay_enabled").eq("contributor_id", profileId).maybeSingle(),
      supabase
        .from("contributions")
        .select("amount, created_at")
        .eq("contributor_id", profileId)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setKiranam({
      profileId,
      role: (profileRes.data?.role as string | undefined) ?? null,
      monthlyAmount: commitmentRes.data ? Number(commitmentRes.data.monthly_amount) : null,
      autopay: commitmentRes.data ? Boolean(commitmentRes.data.autopay_enabled) : null,
      lastGift: giftRes.data ? { amount: Number(giftRes.data.amount), at: giftRes.data.created_at as string } : null,
    });
  }, [contact]);

  useEffect(() => {
    fetchContactData();
  }, [fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contact]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim() || !accountId) return;
    setAddingNote(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("contact_notes")
      .insert({ contact_id: contact.id, account_id: accountId, user_id: session?.user?.id, note_text: newNote.trim() })
      .select()
      .single();
    setAddingNote(false);
    if (error || !data) {
      toast.error(t("noteFailed"));
      return;
    }
    setNotes((prev) => [data, ...prev]);
    setNewNote("");
  }, [contact, newNote, accountId, t]);

  async function addTag(tag: Tag) {
    if (!contact) return;
    const { data, error } = await createClient()
      .from("contact_tags")
      .insert({ contact_id: contact.id, tag_id: tag.id })
      .select("id")
      .single();
    if (error || !data) return toast.error(t("tagFailed"));
    setTags((prev) => [...prev, { ...tag, contact_tag_id: data.id as string }]);
  }

  async function removeTag(contactTagId: string) {
    const prev = tags;
    setTags((p) => p.filter((x) => x.contact_tag_id !== contactTagId));
    const { error } = await createClient().from("contact_tags").delete().eq("id", contactTagId);
    if (error) {
      setTags(prev);
      toast.error(t("tagFailed"));
    }
  }

  if (!contact) {
    return (
      <div className="flex h-full w-70 items-center justify-center border-l border-border bg-card">
        <p className="text-sm text-muted-foreground">{tThread("selectConversation")}</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const optedOut = contact.whatsapp_consent === false;
  const addableTags = allTags.filter((tg) => !tags.some((x) => x.id === tg.id));
  const roleLabel = kiranam?.role === "volunteer" ? t("volunteer") : kiranam?.role === "admin" ? t("admin") : t("contributor");
  const adminHref = kiranam ? `/${kiranam.role === "volunteer" ? "volunteers" : "contributors"}/${kiranam.profileId}` : null;

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-card lg:w-70">
      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold text-foreground">
              {contact.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contact.avatar_url} alt="" className="h-16 w-16 object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{displayName}</h3>
          </div>

          {optedOut && (
            <div role="note" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-destructive">
                <BanIcon className="h-3.5 w-3.5" aria-hidden />
                {t("optedOut")}
              </p>
              <p className="mt-0.5">{t("optedOutHint")}</p>
            </div>
          )}

          <div className="space-y-1">
            <button
              type="button"
              onClick={handleCopyPhone}
              aria-label={t("copyPhone")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-left tabular-nums">{contact.phone}</span>
              {copied ? (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <Check className="h-3 w-3" aria-hidden />
                  {t("copied")}
                </span>
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              )}
            </button>
            {contact.email && (
              <p className="flex items-center gap-2 px-3 py-2 text-sm text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="truncate">{contact.email}</span>
              </p>
            )}
          </div>

          {kiranam !== undefined && (
            <section className="rounded-lg border border-border p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("kiranam")}</h4>
              {kiranam === null ? (
                <p className="mt-1 text-xs text-muted-foreground">{t("notInKiranam")}</p>
              ) : (
                <div className="mt-2 space-y-1.5 text-sm">
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{roleLabel}</span>
                  {kiranam.monthlyAmount !== null && (
                    <p className="text-foreground">
                      <span className="text-muted-foreground">{t("monthly")}: </span>
                      <span className="font-semibold">{inr(kiranam.monthlyAmount)}</span>
                      {kiranam.autopay === false && <span className="text-muted-foreground"> · {t("autopayOff")}</span>}
                    </p>
                  )}
                  <p className="text-foreground">
                    <span className="text-muted-foreground">{t("lastGift")}: </span>
                    {kiranam.lastGift ? (
                      <>
                        <span className="font-semibold">{inr(kiranam.lastGift.amount)}</span> ·{" "}
                        {format(new Date(kiranam.lastGift.at), "d MMM yyyy")}
                      </>
                    ) : (
                      t("noGifts")
                    )}
                  </p>
                  {adminHref && (
                    <a
                      href={adminHref}
                      className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-foreground underline underline-offset-2"
                    >
                      {t("openInAdmin")} <ArrowUpRight className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                </div>
              )}
            </section>
          )}

          <section>
            <div className="flex items-center justify-between">
              <SectionLabel icon={TagIcon}>{t("tags")}</SectionLabel>
              {addableTags.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={t("addTag")}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" aria-hidden />
                    {t("addTag")}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-64 border-border bg-popover">
                    {addableTags.map((tg) => (
                      <DropdownMenuItem key={tg.id} onClick={() => void addTag(tg)} className="text-sm">
                        <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: tg.color }} aria-hidden />
                        {tg.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{t("noTags")}</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag.contact_tag_id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted py-0.5 pl-2 pr-1 text-xs font-medium text-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden />
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => void removeTag(tag.contact_tag_id)}
                      aria-label={t("removeTag", { name: tag.name })}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))
              )}
            </div>
          </section>

          <section>
            <SectionLabel icon={StickyNote}>{t("notes")}</SectionLabel>
            <div className="mt-2">
              <label htmlFor="contact-new-note" className="sr-only">
                {t("addNote")}
              </label>
              <textarea
                id="contact-new-note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t("addNotePlaceholder")}
                rows={2}
                className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
              />
              <Button size="sm" variant="outline" className="mt-1.5" onClick={handleAddNote} disabled={!newNote.trim() || addingNote}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t("addNote")}
              </Button>

              <ul className="mt-3 space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-lg bg-muted px-3 py-2">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{note.note_text}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{format(new Date(note.created_at), "d MMM yyyy, h:mm a")}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
