"use client";

import { useEffect, useState } from "react";
import { androidStoreUrl } from "@/lib/store-links";

// Referral links from the app are kiranam.online/?ref=CODE, so the landing
// page is where a referral code has to survive an install, same as /join:
// on Android the Google Play link carries it as an install referrer, and on
// iPhone (no install-referrer signal) tapping a store button copies this
// page's URL so the app can read the code from the clipboard on first launch.
const REF_RE = /^[A-Za-z0-9]{4,20}$/;

function readRef(): string | null {
  const ref = new URLSearchParams(window.location.search).get("ref");
  return ref && REF_RE.test(ref) ? ref : null;
}

export function StoreLink({
  href,
  android = false,
  className,
  children,
}: {
  href: string;
  android?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  // Server-rendered with the plain store URL; the referral is added once the
  // page knows its own query string.
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once after hydration
    setRef(readRef());
  }, []);

  const onClick = () => {
    if (ref && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  return (
    <a
      href={android ? androidStoreUrl(ref) : href}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
