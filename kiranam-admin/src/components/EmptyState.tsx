import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-kiranam-surface-alt">
        <Icon size={20} className="text-kiranam-muted" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-semibold text-kiranam-ink">{title}</p>
        {description && <p className="mt-1 max-w-xs text-sm text-kiranam-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
