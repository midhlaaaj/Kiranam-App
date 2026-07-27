import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cardClass, staggerDelay } from '@/lib/ui';
import { CountUpValue } from '@/components/CountUpValue';

export function StatCard({
  label,
  value,
  icon: Icon,
  index = 0,
  href,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  index?: number;
  href?: string;
}) {
  const content = (
    <>
      {Icon && (
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-kiranam-primary-soft">
          <Icon size={18} className="text-kiranam-primary" strokeWidth={2} />
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-kiranam-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-kiranam-ink">
        <CountUpValue value={value} />
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${cardClass} animate-stagger-in block p-5 transition hover:border-kiranam-border-strong`}
        style={staggerDelay(index)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`${cardClass} animate-stagger-in p-5`} style={staggerDelay(index)}>
      {content}
    </div>
  );
}
