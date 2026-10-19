"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/whatsapp/use-auth";
import { Sidebar } from "@/components/whatsapp/layout/sidebar";
import { Header } from "@/components/whatsapp/layout/header";
import { PresenceHeartbeat } from "@/components/whatsapp/presence/presence-heartbeat";
import { Skeleton, SkeletonCard, SkeletonPageHeader, SkeletonRegion } from "@/components/whatsapp/ui/skeleton";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Sidebar drawer state — only used on mobile. On lg+ the sidebar is
  // always visible and this stays at `false` (ignored by the component).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) return <ShellSkeleton />;

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Reports this tab's online/away presence once we know a user is
          signed in. Headless — renders nothing. */}
      <PresenceHeartbeat />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        {/* Thinner horizontal padding on mobile so cards have room to breathe. */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * Shown while the session resolves: the same frame as the real shell (sidebar
 * on desktop, top bar on mobile, then the page area) so the layout doesn't
 * jump from a centred spinner to the full app.
 */
function ShellSkeleton() {
  return (
    <SkeletonRegion label="Loading" className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="px-5 py-5">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex-1 space-y-1.5 px-3 py-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-7 w-32" />
        </div>
        <main className="flex-1 overflow-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <SkeletonPageHeader />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </main>
      </div>
    </SkeletonRegion>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
