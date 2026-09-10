"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_MODE,
  MODE_STORAGE_KEY,
  isMode,
  type Mode,
} from "@/lib/whatsapp/themes";

/**
 * ThemeProvider — wraps every /whatsapp page, owns the light/dark mode
 * axis (`data-mode` on the wrapper div). Used to also own a second,
 * independent accent-color axis (`data-theme`, a 6-way picker) — removed
 * in favor of a single fixed brand identity matching the rest of the
 * admin panel; the color values now live unconditionally in the base
 * `[data-wacrm-scope]` CSS block rather than varying by attribute.
 *
 * Originally (standalone wacrm) `data-mode` lived on `<html>`, applied
 * by a `beforeInteractive` boot script so the page painted correctly
 * before React hydrated at all. Merged into kiranam-admin, `<html>` is
 * owned by the root layout and shared with the rest of the admin panel
 * — so this now renders its own wrapper `<div data-wacrm-scope>` (styled
 * via the `[data-wacrm-scope]` CSS blocks in globals.css) instead. That
 * wrapper is part of React's tree, so a pre-hydration boot script isn't
 * available the same way; state starts at the default on both server and
 * client (no hydration mismatch) and a mount-time effect reads the saved
 * localStorage choice and re-renders once — a brief, one-time flash of
 * the default mode on first load, not a bug.
 */

interface ThemeContextValue {
  mode: Mode;
  setMode: (next: Mode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(DEFAULT_MODE);

  // Client-only: apply the saved choice after mount, matching server
  // and first-client-render output exactly (no hydration warning).
  useEffect(() => {
    try {
      const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
      if (isMode(storedMode)) setModeState(storedMode);
    } catch {
      // localStorage can throw in private-browsing / sandboxed contexts.
    }
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Same private-browsing edge case as above; in-memory state still
      // updates so the current tab works for the session.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  // Sync from other tabs — change mode in tab A, tab B catches up
  // without a refresh.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === MODE_STORAGE_KEY) {
        if (isMode(e.newValue) && e.newValue !== mode) setModeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mode]);

  return (
    <div data-wacrm-scope data-mode={mode} className="min-h-full bg-background text-foreground">
      <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
        {children}
      </ThemeContext.Provider>
    </div>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider — return
    // no-op setters so callers don't crash.
    return {
      mode: DEFAULT_MODE,
      setMode: () => {},
      toggleMode: () => {},
    };
  }
  return ctx;
}
