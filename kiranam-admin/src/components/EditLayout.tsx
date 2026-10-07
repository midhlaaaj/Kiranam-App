import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** Two-column layout for record edit pages: details on the left, a sticky
 * status/actions panel on the right (stacks on small screens). */
export function EditLayout({
  backHref,
  backLabel,
  title,
  subtitle,
  badge,
  main,
  aside,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  main: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <div>
      <Link
        href={backHref}
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-kiranam-muted transition hover:text-kiranam-ink hover:underline"
      >
        <ArrowLeft size={15} aria-hidden /> {backLabel}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-3 border-b border-kiranam-border pb-5 lg:pr-14">
        <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight text-kiranam-ink">{title}</h1>
        {badge}
        {subtitle && <p className="w-full text-sm text-kiranam-muted">{subtitle}</p>}
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-6">{main}</div>
        <aside className="grid gap-4 lg:sticky lg:top-6">{aside}</aside>
      </div>
    </div>
  );
}

/** Titled card section used inside EditLayout. */
export function EditCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-kiranam-border bg-kiranam-surface p-5 shadow-elevation-md">
      <h2 className="text-base font-semibold text-kiranam-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-kiranam-muted">{description}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}
