"use client";

import { useEffect, useState } from "react";
import { androidStoreUrl, IOS_STORE_URL } from "@/lib/store-links";

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

// Read synchronously off the URL rather than in an effect + setState —
// this only ever needs to run once, off data that's already there on
// first render (client-side; window is absent during SSR).
function readRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("ref");
}

export function JoinRedirect() {
  const [ref] = useState<string | null>(readRefFromUrl);

  useEffect(() => {
    const platform = detectPlatform();
    const appUrl = ref ? `kiranamapp://join?ref=${encodeURIComponent(ref)}` : "kiranamapp://join";

    // Apple gives apps no install-referrer signal, so on iOS the only way a
    // referral code survives a fresh install is riding along on the
    // clipboard — the app checks for this exact URL shape once, on first
    // launch. Writing to the clipboard without a click is unreliable in
    // some browsers, so this is a best-effort attempt; the button below
    // (a real user gesture) is the reliable path.
    if (ref && platform === "ios" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }

    // If Kiranam is already installed, this opens it directly. If not,
    // nothing visibly happens and the page below (with its own store
    // button) is what the person actually sees and taps.
    window.location.href = appUrl;
  }, [ref]);

  const platform = typeof navigator !== "undefined" ? detectPlatform() : "other";

  const handleContinue = () => {
    if (ref && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    if (platform === "android") {
      window.location.href = androidStoreUrl(ref);
    } else {
      // No App Store listing yet → the landing page (on the main domain,
      // which is where /join is served).
      window.location.href = IOS_STORE_URL ?? "/";
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-kiranam-ink">Opening Kiranam…</h1>
        <p className="text-sm text-kiranam-muted">
          {ref
            ? "If the app doesn't open automatically, tap below — your referral code will be applied."
            : "If the app doesn't open automatically, tap below to get it."}
        </p>
      </div>
      <button
        type="button"
        onClick={handleContinue}
        className="rounded-full bg-kiranam-primary px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-kiranam-primary-strong"
      >
        Continue to Kiranam
      </button>
    </main>
  );
}
