"use client";

import { useEffect, useState } from "react";

// TODO: replace with the real listings once Kiranam is published on both
// stores — every campaign/event/referral share link in the app points here
// so this is the only place that needs to change.
const IOS_STORE_URL = "https://kiranam.online";
const ANDROID_PACKAGE = "com.kiranam.app";
const ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

// Builds the Play Store URL with the referrer query param the Play Install
// Referrer API hands back to the app after a fresh install — this is a
// free, first-party mechanism (no Branch/AppsFlyer needed) for carrying a
// referral code through an Android install.
function androidStoreUrl(ref: string | null): string {
  if (!ref) return ANDROID_STORE_URL;
  return `${ANDROID_STORE_URL}&referrer=${encodeURIComponent(`ref_${ref}`)}`;
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
      window.location.href = IOS_STORE_URL;
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
