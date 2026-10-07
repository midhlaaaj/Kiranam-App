"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/whatsapp/use-auth";
import {
  ArrowLeft,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  User,
} from "lucide-react";

// wacrm is served from this same Next.js app (under /whatsapp), sharing
// the admin's session cookie directly — no cross-domain bridge needed.
// NEXT_PUBLIC_ADMIN_URL lets a split-deployment setup point elsewhere;
// unset, it falls back to "/", the dashboard root in this app (not
// "/admin", which doesn't exist here and previously 404'd).
const ADMIN_PANEL_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "/";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/whatsapp/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/whatsapp/ui/dropdown-menu";
import { ModeToggle } from "@/components/whatsapp/layout/mode-toggle";

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
}

import { useTranslations } from "next-intl";

export function Header({ onOpenSidebar }: HeaderProps) {
  const t = useTranslations("Header");
  const { profile, signOut } = useAuth();

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {/* Hamburger — mobile only. 44×44 hit target per Apple HIG. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openMenu")}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Every page already renders its own heading right below this
            bar — repeating it here just duplicated the title on screen.
            On mobile (where the sidebar's "Kiranam / WhatsApp"
            wordmark is hidden behind the drawer) show it here instead,
            so there's still brand/wayfinding context with the drawer
            closed; lg:hidden since the sidebar already shows it on
            desktop. */}
        <Link
          href="/whatsapp/dashboard"
          className="flex items-baseline gap-1.5 lg:hidden"
        >
          <span className="text-base font-extrabold tracking-tight text-kiranam-brand">
            Kiranam
          </span>
          <span className="text-xs font-medium text-muted-foreground">WhatsApp</span>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ModeToggle />

        <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none data-popup-open:bg-muted/70 sm:gap-3 sm:pl-1 sm:pr-3"
          aria-label={t("openAccountMenu")}
        >
          <Avatar className="size-8">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? t("defaultAvatar")}
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {profile?.full_name ?? t("defaultUser")}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56 bg-popover text-popover-foreground ring-border"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.full_name ?? t("defaultUser")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            render={
              // Profile/password/sessions live only in the admin panel now
              // (same shared account) — a real cross-app link, not a
              // same-app route, so <a> rather than next/link's <Link>.
              <a
                href={`${ADMIN_PANEL_URL}/settings/account`}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <User className="size-4" />
            {t("menuProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                href="/whatsapp/settings?tab=whatsapp"
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <SettingsIcon className="size-4" />
            {t("menuSettings")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                href={ADMIN_PANEL_URL}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <ArrowLeft className="size-4" />
            {t("menuBackToAdmin")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onClick={signOut}
            className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <LogOut className="size-4" />
            {t("menuSignOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
