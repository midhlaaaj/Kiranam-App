"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/whatsapp/utils";
import { useAuth } from "@/hooks/whatsapp/use-auth";
import { useTotalUnread } from "@/hooks/whatsapp/use-total-unread";
import { Skeleton } from "@/components/whatsapp/ui/skeleton";
import { useUnreadNotifications } from "@/hooks/whatsapp/use-unread-notifications";
import {
  ArrowLeft,
  Bell,
  Bot,
  Crown,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  X,
  Zap,
  Gauge,
} from "lucide-react";

// wacrm is served from this same Next.js app (under /whatsapp), sharing
// the admin's session cookie directly — no cross-domain bridge needed.
// NEXT_PUBLIC_ADMIN_URL lets a split-deployment setup point elsewhere;
// unset, it falls back to "/", the dashboard root in this app (not
// "/admin", which doesn't exist here and previously 404'd).
const ADMIN_PANEL_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "/";
import type { AccountRole } from "@/lib/whatsapp/auth/roles";

// Per-role chip metadata used in the sidebar's account strip + the
// Members tab roster. Keeping this near both consumers in a single
// place avoids drift between the two surfaces — when a designer
// wants to recolour "agent" rows, this is the one diff.
const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; labelKey: string; className: string }
> = {
  owner: {
    icon: Crown,
    labelKey: "roleOwner",
    // Amber: scarce, immutable, "the boss" — gets visual emphasis.
    className:
      "border-warning/30 bg-warning-soft text-warning",
  },
  admin: {
    icon: Shield,
    labelKey: "roleAdmin",
    // Primary-tinted: significant but not as scarce as owner.
    className:
      "border-primary/40 bg-primary/10 text-primary",
  },
  agent: {
    icon: UserCog,
    labelKey: "roleAgent",
    // Neutral slate: the operational default.
    className:
      "border-border bg-muted text-foreground",
  },
  viewer: {
    icon: User,
    labelKey: "roleViewer",
    // Muted slate: read-only role; visually quieter than agent.
    className:
      "border-border bg-card text-muted-foreground",
  },
};
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/whatsapp/ui/avatar";

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  /**
   * When true, the nav row renders a small "Beta" chip after the label.
   * Purely informational — doesn't affect routing or access.
   */
  beta?: boolean;
}

const navItems: NavItem[] = [
  { href: "/whatsapp/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/whatsapp/inbox", labelKey: "inbox", icon: MessageSquare },
  { href: "/whatsapp/notifications", labelKey: "notifications", icon: Bell },
  { href: "/whatsapp/contacts", labelKey: "contacts", icon: Users },
  { href: "/whatsapp/broadcasts", labelKey: "broadcasts", icon: Radio },
  { href: "/whatsapp/sending-limits", labelKey: "sendingLimits", icon: Gauge },
  { href: "/whatsapp/templates", labelKey: "templates", icon: FileText },
  { href: "/whatsapp/automations", labelKey: "automations", icon: Zap },
  { href: "/whatsapp/flows", labelKey: "flows", icon: Workflow },
  { href: "/whatsapp/agents", labelKey: "aiAgents", icon: Bot },
];

const bottomNavItems = [
  { href: "/whatsapp/settings", labelKey: "settings", icon: Settings },
];

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
}

import { useTranslations } from "next-intl";
import { ModeToggle } from "@/components/whatsapp/layout/mode-toggle";

function ActiveIndicator() {
  return (
    <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary" aria-hidden />
  );
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const t = useTranslations("Sidebar");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  // Only surface the account-name strip when it actually carries
  // information. A solo user's personal account is named after them
  // (the 017 signup trigger seeds it from `full_name`), so showing it
  // here would just duplicate the user name in the footer below. Once
  // the account is renamed or the user joins a shared account, the
  // name diverges and the strip becomes meaningful — that's the signal
  // we gate on. Wait for the profile fetch to settle first, otherwise
  // the strip flashes in once the row resolves (a layout jump).
  const showAccountStrip =
    !profileLoading &&
    !!account?.name &&
    account.name !== profile?.full_name;

  // Unread count in the browser tab ("(3) Inbox — …") so a waiting customer
  // is visible from another tab. Writes to document.title (external).
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = totalUnread > 0 ? `(${totalUnread > 99 ? "99+" : totalUnread}) ${base}` : base;
  }, [totalUnread, pathname]);

  // Close the drawer when route changes — users opened it to navigate,
  // so once they pick a destination the drawer should get out of the way.
  useEffect(() => {
    onClose?.();
    // Only pathname drives this — onClose identity doesn't need to re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll and allow Escape to close while the drawer is open on
  // mobile. No-ops on desktop because the sidebar isn't positioned there.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — only exists on mobile and only when open. Clicking
          it closes the drawer. Hidden from lg+ since the sidebar is
          part of the main flex row there. */}
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          // Mobile: fixed drawer that slides in from the left.
          "fixed inset-y-0 left-0 z-40 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card",
          // `invisible` when closed takes the off-screen drawer's links out
          // of the tab order; visibility is transitioned so the slide-out
          // still animates. lg:visible keeps the desktop sidebar unaffected.
          "transition-[transform,visibility] duration-200 ease-out will-change-transform",
          open ? "visible translate-x-0" : "invisible -translate-x-full lg:visible",
          // Desktop: static, always visible — reset all the mobile framing.
          "lg:static lg:z-0 lg:w-64 lg:max-w-none lg:translate-x-0 lg:transition-none",
        )}
        aria-label="WhatsApp navigation"
      >
        {/* Logo row. On mobile we put a close button here; on desktop the
            close button is hidden since the sidebar is always-visible. */}
        {/* Same wordmark row as the admin sidebar (AdminShell). */}
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-5 py-5">
          <Link href="/whatsapp/dashboard" className="flex min-w-0 items-baseline gap-1.5">
            <span className="text-3xl leading-none font-extrabold tracking-tight text-kiranam-brand">
              Kiranam
            </span>
            <span className="truncate text-sm font-medium text-muted-foreground">WhatsApp</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Always-visible way back to the main admin panel. */}
        <Link
          href={ADMIN_PANEL_URL}
          className="mx-3 mt-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-[17px] w-[17px]" aria-hidden />
          {t("menuBackToAdmin")}
        </Link>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/whatsapp/dashboard" && pathname.startsWith(item.href));

              const showUnreadCount = item.href === "/whatsapp/inbox" && totalUnread > 0;

              // Unlike the inbox dot, the notifications count stays visible
              // even while the page is active — it reflects unread state
              // (cleared by marking notifications read), not "currently
              // viewing this section".
              const showNotificationBadge =
                item.href === "/whatsapp/notifications" && unreadNotifications > 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      // Same row as the admin sidebar (SidebarNav): 44px tall, soft
                      // brand fill + left indicator bar when active.
                      "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {isActive && <ActiveIndicator />}
                    <item.icon className="h-[17px] w-[17px]" aria-hidden />
                    <span className="flex-1">{t(item.labelKey as string)}</span>
                    {item.beta && (
                      <span
                        aria-label={t("beta")}
                        className="rounded-full border border-warning/30 bg-warning-soft px-1.5 py-0.5 text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider text-warning"
                      >
                        {t("beta")}
                      </span>
                    )}
                    {showUnreadCount && (
                      <span
                        aria-label={t("unreadConversations", { count: totalUnread })}
                        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs sm:text-[11px] font-semibold tabular-nums text-primary-foreground"
                      >
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                    {showNotificationBadge && (
                      <span
                        aria-label={t("unreadNotifications", { count: unreadNotifications })}
                        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-xs sm:text-[11px] font-semibold tabular-nums text-foreground"
                      >
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-border" />

          <ul className="flex flex-col gap-0.5">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {isActive && <ActiveIndicator />}
                    <item.icon className="h-[17px] w-[17px]" aria-hidden />
                    {t(item.labelKey as string)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-border p-3">
          {/* Account name display — surfaced only when the account
              name differs from the user's own name (see
              `showAccountStrip`). For a default solo account the two
              match, so we hide it to avoid duplicating the user name
              below; for renamed or shared accounts it tells the user
              which account they're acting in. */}
          {showAccountStrip && account?.name ? (
            <div className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              {/* `title=` exposes the full name on hover when it
                  gets truncated (long account names + narrow
                  sidebars). Cheap a11y win. */}
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole ? (
                // Always render the chip — owners used to be
                // invisible here, which made them indistinguishable
                // from admins at a glance. Now everyone sees their
                // role (with a colour cue) regardless of tier.
                (() => {
                  const meta = ROLE_CHIP[accountRole];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] sm:text-[10px] font-medium uppercase tracking-wider ${meta.className}`}
                    >
                      <Icon className="size-3" />
                      {t(meta.labelKey as string)}
                    </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}
          {/* Account actions live in the header menu (visible on every
              screen size); this is a quick link to your profile. */}
          <a
            href={`${ADMIN_PANEL_URL.replace(/\/$/, "")}/settings/account`}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60"
          >
            {profileLoading && !profile ? (
              // Hold the chip's shape until the profile arrives instead of
              // flashing the "U" / "User" placeholders and then swapping.
              <>
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1 space-y-1.5" role="status" aria-label="Loading profile">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </span>
              </>
            ) : (
              <>
                <Avatar className="size-8 shrink-0">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-sm font-medium text-foreground">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ??
                      profile?.email?.charAt(0)?.toUpperCase() ??
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {profile?.full_name ?? t("defaultUser")}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{profile?.email ?? ""}</span>
                </span>
              </>
            )}
          </a>
        </div>
        {/* Log out sits at the very bottom, as in the admin sidebar. The
            theme toggle rides along here because the top bar is mobile-only. */}
        <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-[17px] w-[17px]" aria-hidden />
            {tHeader("menuSignOut")}
          </button>
          <ModeToggle />
        </div>
      </aside>
    </>
  );
}
