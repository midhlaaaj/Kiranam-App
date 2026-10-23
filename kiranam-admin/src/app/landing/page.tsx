import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { ANDROID_STORE_URL, IOS_STORE_URL } from "@/lib/store-links";
import styles from "./landing.module.css";
import { StoreLink } from "./StoreLink";

// Served at kiranam.online/ — proxy.ts rewrites the main domain's root here,
// since / itself is the admin dashboard (on admin.kiranam.online).

// The mobile app's typeface, so the page reads as the same product.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-landing",
});

export const metadata: Metadata = {
  title: "Karunya Kiranam — Health Care Foundation",
  description:
    "Empowering lives, inspiring smiles. Get the Karunya Kiranam app by Health Care Foundation.",
};

export default function LandingPage() {
  return (
    <div className={`${styles.page} ${inter.variable} flex min-h-dvh flex-col`}>
      <div className={styles.rings} aria-hidden="true" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <Image
          src="/kiranam-icon.png"
          alt="Healthcare Foundation logo"
          width={112}
          height={112}
          priority
          className={`${styles.logo} size-24 sm:size-28`}
        />

        <h1 className={`${styles.title} ${styles.rise} ${styles.d1} mt-9`}>Karunya Kiranam</h1>
        <div className={`${styles.divider} mt-6`} aria-hidden="true" />
        <p className={`${styles.tagline} ${styles.rise} ${styles.d2} mt-6 max-w-md text-lg leading-relaxed sm:text-xl`}>
          Empowering lives, inspiring smiles
        </p>

        <div className={`${styles.rise} ${styles.d3} mt-11 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row`}>
          <StoreButton href={ANDROID_STORE_URL} android eyebrow="Get it on" store="Google Play" icon={<GooglePlayIcon />} />
          <StoreButton href={IOS_STORE_URL} eyebrow="Download on the" store="App Store" icon={<AppleIcon />} />
        </div>

        <p className={`${styles.meta} ${styles.rise} ${styles.d4} mt-8 text-sm`}>
          An initiative of Health Care Foundation, Kerala
        </p>
      </main>

      <footer className="px-4 pb-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 border-t border-white/15 pt-6 text-sm sm:flex-row sm:justify-between">
          <p className={styles.meta}>Reg. SRA No. 423/2010, Government of Kerala</p>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-1 font-medium">
            <Link href="/legal/privacy" className={styles.footLink}>Privacy</Link>
            <Link href="/legal/terms" className={styles.footLink}>Terms</Link>
            <Link href="/legal/data-deletion" className={styles.footLink}>Data deletion</Link>
            <a href="mailto:support@kiranam.online" className={styles.footLink}>Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function StoreButton({
  href,
  android = false,
  eyebrow,
  store,
  icon,
}: {
  href: string | null;
  android?: boolean;
  eyebrow: string;
  store: string;
  icon: React.ReactNode;
}) {
  const content = (
    <>
      {icon}
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[11px] font-medium opacity-70">{href ? eyebrow : "Coming soon to"}</span>
        <span className="text-[17px] font-bold tracking-tight">{store}</span>
      </span>
    </>
  );
  const shape = "flex min-h-14 items-center justify-center gap-3 rounded-full py-2.5 pl-5 pr-7 sm:justify-start";

  // No listing yet (see store-links.ts) → a non-interactive placeholder in
  // the same footprint, so the layout doesn't shift once it's wired up.
  if (!href) {
    return (
      <span className={`${styles.storeSoon} ${shape}`} aria-label={`${store} — coming soon`}>
        {content}
      </span>
    );
  }
  return (
    <StoreLink href={href} android={android} className={`${styles.store} ${shape}`}>
      {content}
    </StoreLink>
  );
}

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M3.6 1.8 13.7 12 3.6 22.2c-.3-.2-.6-.6-.6-1.1V2.9c0-.5.3-.9.6-1.1Z" />
      <path fill="#34A853" d="M3.6 1.8 13.7 12l3.2-3.2L5.3 2.1c-.6-.3-1.2-.5-1.7-.3Z" />
      <path fill="#EA4335" d="M3.6 22.2 13.7 12l3.2 3.2-11.6 6.7c-.6.3-1.2.5-1.7.3Z" />
      <path fill="#FBBC04" d="m16.9 8.8-3.2 3.2 3.2 3.2 3.7-2.1c.9-.5.9-1.7 0-2.2l-3.7-2.1Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.54 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.5ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22Z" />
    </svg>
  );
}
