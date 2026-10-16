import type { Metadata } from "next";
import Link from "next/link";
import { ANDROID_STORE_URL, IOS_STORE_URL } from "@/lib/store-links";

// Served at kiranam.online/ — proxy.ts rewrites the main domain's root here,
// since / itself is the admin dashboard (on admin.kiranam.online).
export const metadata: Metadata = {
  title: "Kiranam — Health Care Foundation",
  description:
    "Support Health Care Foundation's campaigns, volunteer with us, and stay up to date — all from the Kiranam app.",
};

const FEATURES = [
  {
    title: "Contribute",
    body: "Give to the campaigns you care about in a few taps, with secure payments and a receipt for every contribution.",
  },
  {
    title: "Volunteer",
    body: "Apply to volunteer, help contributors in your area, and keep track of the people you support.",
  },
  {
    title: "Stay updated",
    body: "Hear about new campaigns, events and announcements from the foundation as they happen.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6 pt-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-bold text-kiranam-ink">Kiranam</span>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-kiranam-primary">
            By Health Care Foundation
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight text-kiranam-ink sm:text-5xl">
            Care for your community, <span className="text-kiranam-primary">from your phone.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-kiranam-muted">
            Kiranam brings contributors and volunteers together to support the foundation&apos;s work. Get the
            app to start contributing or volunteering today.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <StoreButton href={ANDROID_STORE_URL} label="Get it on" store="Google Play" />
            {IOS_STORE_URL ? (
              <StoreButton href={IOS_STORE_URL} label="Download on the" store="App Store" />
            ) : (
              <div
                aria-disabled="true"
                className="flex min-w-48 flex-col rounded-2xl border border-kiranam-border-strong bg-kiranam-surface px-6 py-3 text-kiranam-muted"
              >
                <span className="text-xs">Coming soon to the</span>
                <span className="text-lg font-semibold">App Store</span>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-kiranam-surface p-6">
              <h2 className="text-lg font-bold text-kiranam-ink">{f.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-kiranam-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-kiranam-border-strong">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-kiranam-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Health Care Foundation, Kozhikode, Kerala</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="hover:text-kiranam-ink">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-kiranam-ink">Terms</Link>
            <Link href="/legal/data-deletion" className="hover:text-kiranam-ink">Data deletion</Link>
            <a href="mailto:support@kiranam.online" className="hover:text-kiranam-ink">support@kiranam.online</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function StoreButton({ href, label, store }: { href: string; label: string; store: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-48 flex-col rounded-2xl bg-kiranam-ink px-6 py-3 text-white transition hover:bg-kiranam-ink/85"
    >
      <span className="text-xs text-white/70">{label}</span>
      <span className="text-lg font-semibold">{store}</span>
    </a>
  );
}
