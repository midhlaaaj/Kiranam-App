'use client';

import { useEffect, useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { SidebarNav } from '@/components/SidebarNav';

function SidebarContent({
  initials,
  email,
  onLogout,
  onNavigate,
  onClose,
}: {
  initials: string;
  email: string;
  onLogout: React.ReactNode;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-kiranam-border px-5 py-5">
        <div className="min-w-0">
          <p className="text-3xl leading-none font-extrabold tracking-tight text-kiranam-primary">Kiranam</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <SidebarNav onNavigate={onNavigate} />

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
  children,
}: {
  initials: string;
  email: string;
  logoutButton: React.ReactNode;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
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
        <SidebarContent initials={initials} email={email} onLogout={logoutButton} />
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
      >
        <SidebarContent
          initials={initials}
          email={email}
          onLogout={logoutButton}
          onNavigate={() => setDrawerOpen(false)}
          onClose={() => setDrawerOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-kiranam-border bg-kiranam-surface px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="cursor-pointer rounded-lg p-1.5 text-kiranam-ink transition hover:bg-kiranam-surface-alt"
          >
            <Menu size={20} />
          </button>
          <p className="text-sm font-bold tracking-tight text-kiranam-ink">Kiranam Admin</p>
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function LogoutIcon() {
  return <LogOut size={17} strokeWidth={2} />;
}
