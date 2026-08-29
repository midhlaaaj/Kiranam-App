'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cardClass } from '@/lib/ui';

/** Generic centered popup — overlay + panel, closes on backdrop click, Escape,
 * or the X button. Plain state-driven (no portal/animation library), matching
 * the modal pattern already used on the mobile app side for consistency. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`flex w-full max-w-lg max-h-[calc(100dvh-2rem)] flex-col ${cardClass} p-6`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-kiranam-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-kiranam-muted transition hover:bg-kiranam-surface-alt hover:text-kiranam-ink"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
