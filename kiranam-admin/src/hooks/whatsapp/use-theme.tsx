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
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  STORAGE_KEY,
  isMode,
  isThemeId,
  type Mode,
  type ThemeId,
} from "@/lib/whatsapp/themes";

/**
 * ThemeProvider — wraps every /whatsapp page, owns the two theming axes:
 *   • `theme` — the accent color (`data-theme` on the wrapper div)
 *   • `mode`  — light / dark (`data-mode` on the wrapper div)
 * The two are independent, so any accent renders in either mode.
 *
 * Originally (standalone wacrm) these attributes lived on `<html>`,
 * applied by a `beforeInteractive` boot script so the page painted
 * correctly before React hydrated at all. Merged into kiranam-admin,
 * `<html>` is owned by the root layout and shared with the rest of the
 * admin panel — so this now renders its own wrapper `<div data-wacrm-scope>`
 * (styled via the `[data-wacrm-scope]` CSS blocks in globals.css) instead.
 * That wrapper is part of React's tree, so a pre-hydration boot script
 * isn't available the same way; state starts at the default on both
 * server and client (no hydration mismatch) and a mount-time effect
 * reads the saved localStorage choice and re-renders once — a brief,
 * one-time flash of the default theme on first load, not a bug.
 */

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (next: ThemeId) => void;
  mode: Mode;
  setMode: (next: Mode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setModeState] = useState<Mode>(DEFAULT_MODE);

  // Client-only: apply the saved choice after mount, matching server
  // and first-client-render output exactly (no hydration warning).
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEY);
      if (isThemeId(storedTheme)) setThemeState(storedTheme);
      const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
      if (isMode(storedMode)) setModeState(storedMode);
    } catch {
      // localStorage can throw in private-browsing / sandboxed contexts.
    }
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Same private-browsing edge case as above; in-memory state still
      // updates so the current tab works for the session.
    }
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Same private-browsing edge case as above.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  // Sync from other tabs — change theme or mode in tab A, tab B catches
  // up without a refresh.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        if (isThemeId(e.newValue) && e.newValue !== theme) setThemeState(e.newValue);
        return;
      }
      if (e.key === MODE_STORAGE_KEY) {
        if (isMode(e.newValue) && e.newValue !== mode) setModeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [theme, mode]);

  return (
    <div data-wacrm-scope data-theme={theme} data-mode={mode} className="min-h-full bg-background text-foreground">
      <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, toggleMode }}>
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
      theme: DEFAULT_THEME,
      setTheme: () => {},
      mode: DEFAULT_MODE,
      setMode: () => {},
      toggleMode: () => {},
    };
  }
  return ctx;
}
