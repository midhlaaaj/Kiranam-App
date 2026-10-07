'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Warns before leaving a page with unsaved work — both a tab close/refresh
 * (native prompt) and in-app navigation through any <a href> (sidebar,
 * breadcrumbs, back links), which `beforeunload` never sees in the App
 * Router. Render a ConfirmDialog with the returned state:
 *
 *   const guard = useUnsavedChangesGuard(dirty);
 *   <ConfirmDialog open={guard.open} onOpenChange={guard.setOpen}
 *     title="Leave without saving?" confirmLabel="Leave" destructive
 *     onConfirm={guard.proceed} />
 *
 * Call `guard.navigate(href)` for programmatic navigation (e.g. a Back
 * button) so it goes through the same check.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      pendingHref.current = url.pathname + url.search + url.hash;
      setOpen(true);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const navigate = useCallback(
    (href: string) => {
      if (!dirtyRef.current) return router.push(href);
      pendingHref.current = href;
      setOpen(true);
    },
    [router]
  );

  const proceed = useCallback(() => {
    setOpen(false);
    dirtyRef.current = false;
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.push(href);
  }, [router]);

  return { open, setOpen, proceed, navigate };
}
