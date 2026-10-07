'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { SidebarNav } from '@/components/SidebarNav';

function SidebarContent({
  initials,
  email,
  onLogout,
  onNavigate,
  onClose,
  closeRef,
  navBadges,
}: {
  initials: string;
  email: string;
  onLogout: React.ReactNode;
  onNavigate?: () => void;
  onClose?: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
  navBadges?: Record<string, React.ReactNode>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-kiranam-border px-5 py-5">
        <div className="min-w-0">
          <p className="text-3xl leading-none font-extrabold tracking-tight text-kiranam-brand">Kiranam</p>
        </div>
        {onClose && (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <SidebarNav onNavigate={onNavigate} badges={navBadges} />

      <div className="flex items-center gap-2.5 border-t border-kiranam-border px-5 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kiranam-ink text-[11px] font-bold text-white">
          {initials}
        </div>
        <p className="min-w-0 flex-1 truncate text-xs text-kiranam-muted">{email}</p>
      </div>
      <div className="border-t border-kiranam-border p-3">{onLogout}</div>
    </div>
  );
}

export function AdminShell({
  initials,
  email,
  logoutButton,
  navBadges,
  bell,
  children,
}: {
  initials: string;
  email: string;
  logoutButton: React.ReactNode;
  /** Count badges keyed by nav href (e.g. pending applications). */
  navBadges?: Record<string, React.ReactNode>;
  /** Notification bell — shown in the top bar of every admin page. */
  bell?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!drawerOpen) {
      // Return focus to the hamburger only when closing (not on first mount).
      if (wasOpen.current) openButtonRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-dvh bg-kiranam-bg">
      {/* Desktop sidebar — pinned, never scrolls */}
      <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-kiranam-border bg-kiranam-surface lg:sticky lg:top-0 lg:flex">
        <SidebarContent initials={initials} email={email} onLogout={logoutButton} navBadges={navBadges} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-out lg:hidden ${
          drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-kiranam-surface shadow-elevation-lg transition-transform duration-300 ease-out lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        // Off-screen while closed — keep its links out of the tab order.
        inert={!drawerOpen}
      >
        <SidebarContent
          initials={initials}
          email={email}
          onLogout={logoutButton}
          navBadges={navBadges}
          onNavigate={() => setDrawerOpen(false)}
          onClose={() => setDrawerOpen(false)}
          closeRef={closeButtonRef}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — hamburger, logo and the notification bell. */}
        <div className="flex items-center gap-3 border-b border-kiranam-border bg-kiranam-surface px-4 py-3 lg:hidden">
          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-kiranam-ink transition hover:bg-kiranam-surface-alt"
          >
            <Menu size={20} />
          </button>
          <p className="text-3xl leading-none font-extrabold tracking-tight text-kiranam-brand">Kiranam</p>
          <div className="ml-auto">{bell}</div>
        </div>

        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Desktop: the bell sits top-right on every page, exactly where it
              used to sit inside page headings (no extra bar). Headings keep
              lg:pr-14 clear of it. On mobile it's in the top bar above. */}
          <div className="absolute right-8 top-8 z-20 hidden lg:block">{bell}</div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function LogoutIcon() {
  return <LogOut size={17} strokeWidth={2} />;
}
