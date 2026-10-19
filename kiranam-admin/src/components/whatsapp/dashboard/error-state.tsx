import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/whatsapp/ui/button'
import { cn } from '@/lib/whatsapp/utils'

/**
 * Shown in place of a widget whose data failed to load, so a failed request
 * never leaves its skeleton on screen forever. Same footprint as EmptyState.
 */
export function ErrorState({
  title = "Couldn't load this",
  onRetry,
  className,
}: {
  title?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-center',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
