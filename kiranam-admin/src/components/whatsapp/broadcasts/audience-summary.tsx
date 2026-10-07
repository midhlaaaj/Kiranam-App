'use client';

import { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { useAuth } from '@/hooks/whatsapp/use-auth';
import {
  isAudienceComplete,
  resolveAudience,
  type AudienceBreakdown,
  type AudienceConfig,
} from '@/lib/whatsapp/broadcast-audience';

/** Live "who will receive this" breakdown. Uses the same resolver as the
 * actual send, so the confirmed number is the sent number. Reports each
 * finished count upward via `onCount(count, audienceKey)` — callers compare
 * the key with `audienceKey(audience)` to know the number is current. */
export function audienceKey(audience: AudienceConfig) {
  return JSON.stringify(audience);
}

export function AudienceSummary({
  audience,
  onCount,
}: {
  audience: AudienceConfig;
  onCount?: (count: number, key: string) => void;
}) {
  const t = useTranslations('Broadcasts.wizard.selectAudience');
  const { accountId } = useAuth();
  const complete = isAudienceComplete(audience);
  const key = audienceKey(audience);
  const [result, setResult] = useState<{ key: string; breakdown?: AudienceBreakdown; error?: boolean } | null>(null);
  const current = result?.key === key ? result : null;
  const state: 'idle' | 'loading' | 'error' = !complete ? 'idle' : !current ? 'loading' : current.error ? 'error' : 'idle';
  const breakdown = current?.breakdown ?? null;

  useEffect(() => {
    if (!complete) return;
    let cancelled = false;
    // Debounced so typing in the custom-field value box doesn't refetch per key.
    const timer = setTimeout(async () => {
      try {
        const { breakdown: b } = await resolveAudience(createClient(), accountId, JSON.parse(key));
        if (cancelled) return;
        setResult({ key, breakdown: b });
        onCount?.(b.willReceive, key);
      } catch {
        if (!cancelled) setResult({ key, error: true });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, complete, accountId]);

  return (
    <div className="rounded-xl border border-border bg-card p-4" aria-live="polite">
      <p className="text-sm font-medium text-foreground">{t('summaryTitle')}</p>
      {!complete ? (
        <p className="mt-1 text-sm text-muted-foreground">{t('summaryIncomplete')}</p>
      ) : state === 'loading' ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('summaryCalculating')}
        </p>
      ) : state === 'error' || !breakdown ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {t('summaryError')}
        </p>
      ) : (
        <div className="mt-2 space-y-1.5 text-sm">
          <p className="text-muted-foreground">{t('summaryMatched', { count: breakdown.matched })}</p>
          {breakdown.excludedByTag > 0 && (
            <p className="text-muted-foreground">− {t('summaryExcludedTags', { count: breakdown.excludedByTag })}</p>
          )}
          {breakdown.paused > 0 && <p className="text-muted-foreground">− {t('summaryPaused', { count: breakdown.paused })}</p>}
          {breakdown.noConsent > 0 && (
            <p className="text-muted-foreground">− {t('summaryNoConsent', { count: breakdown.noConsent })}</p>
          )}
          <p className="flex items-center gap-2 border-t border-border pt-2 font-semibold text-foreground">
            <Users className="h-4 w-4" aria-hidden />
            {t('summaryWillReceive', { count: breakdown.willReceive })}
          </p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t('summaryAlwaysExcluded')}</p>
    </div>
  );
}
