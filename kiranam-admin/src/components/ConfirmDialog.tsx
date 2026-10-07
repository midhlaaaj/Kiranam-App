'use client';

import { useId, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** The one confirm dialog for both the admin panel and the comm center.
 * Controlled (`open`/`onOpenChange`) so it can guard any action — not just a
 * button. For the highest-risk actions pass `confirmText`: the confirm button
 * stays disabled until the user types it exactly. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  confirmLabel,
  onConfirm,
  destructive = false,
  confirmText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** Bullet list of what will happen — shown in a warning panel. */
  consequences?: React.ReactNode[];
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  /** Text the user must type to enable the confirm button. */
  confirmText?: string;
}) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const locked = !!confirmText && typed.trim() !== confirmText;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped('');
        onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {consequences && consequences.length > 0 && (
          <div
            className={cn(
              'rounded-lg border p-3 text-sm text-kiranam-ink',
              destructive ? 'border-kiranam-danger/30 bg-kiranam-danger-soft' : 'border-kiranam-border bg-kiranam-surface-alt'
            )}
          >
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={15} className={destructive ? 'text-kiranam-danger' : 'text-kiranam-warning'} aria-hidden />
              This will:
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-6">
              {consequences.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {confirmText && (
          <div className="grid gap-1.5">
            <label htmlFor={inputId} className="text-sm text-kiranam-ink">
              Type <span className="font-mono font-semibold">{confirmText}</span> to confirm
            </label>
            <input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={inputClass}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={locked}
            onClick={() => {
              setTyped('');
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
