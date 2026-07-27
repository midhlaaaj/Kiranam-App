import Link from 'next/link';

export function Tabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="flex gap-6 border-b border-kiranam-border">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`relative -mb-px pb-3 text-sm font-semibold transition-colors duration-200 ease-out ${
            item.active ? 'text-kiranam-ink' : 'text-kiranam-muted hover:text-kiranam-ink'
          }`}
        >
          {item.label}
          {item.active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-kiranam-primary" />}
        </Link>
      ))}
    </div>
  );
}
