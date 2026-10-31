'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Search, X } from 'lucide-react';
import { Skeleton, SkeletonRegion } from '@/components/whatsapp/ui/skeleton';
import { isKkSearch } from '@/lib/search';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { Input } from '@/components/whatsapp/ui/input';
import { Button } from '@/components/whatsapp/ui/button';
import { cn } from '@/lib/whatsapp/utils';

interface PickerContact {
  id: string;
  name: string | null;
  phone: string | null;
  whatsapp_consent: boolean | null;
}

const RESULT_LIMIT = 50;

/** `.or()` filter values break on commas, parentheses and wildcards. */
function sanitizeQuery(q: string) {
  return q.trim().replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ');
}

const label = (c: PickerContact, noName: string) => c.name?.trim() || noName;

/**
 * Hand-pick broadcast recipients: search by name or phone, tick the people
 * you want, and see (and remove) your selection below. Selection is kept as
 * a list of contact ids in the wizard's audience config.
 */
export function ContactPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations('Broadcasts.wizard.selectAudience');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerContact[] | null>(null);
  // Names/phones for everything ever shown or selected, so the "selected"
  // list still reads properly after the search results change.
  const [known, setKnown] = useState<Record<string, PickerContact>>({});

  const remember = (rows: PickerContact[]) =>
    setKnown((prev) => {
      const next = { ...prev };
      for (const r of rows) next[r.id] = r;
      return next;
    });

  // Debounced search. Empty query lists the first contacts alphabetically.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const q = sanitizeQuery(query);
      let req = createClient().from('contacts').select('id, name, phone, whatsapp_consent').order('name').limit(RESULT_LIMIT);
      if (q) {
        const parts = [`name.ilike.%${q}%`, `phone.ilike.%${q}%`];
        if (isKkSearch(q)) {
          const { data: kkProfiles } = await createClient()
            .from('profiles')
            .select('id')
            .ilike('kk_number', `%${q.replace(/\s/g, '')}%`)
            .limit(300);
          if (kkProfiles?.length) parts.push(`kiranam_profile_id.in.(${kkProfiles.map((p) => p.id).join(',')})`);
        }
        req = req.or(parts.join(','));
      }
      const { data } = await req;
      if (cancelled) return;
      const rows = (data ?? []) as PickerContact[];
      setResults(rows);
      remember(rows);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Coming Back to this step: fetch names for ids we haven't seen yet.
  useEffect(() => {
    const missing = selectedIds.filter((id) => !known[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      for (let i = 0; i < missing.length; i += 300) {
        const { data } = await supabase
          .from('contacts')
          .select('id, name, phone, whatsapp_consent')
          .in('id', missing.slice(i, i + 300));
        if (!cancelled && data) remember(data as PickerContact[]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `known` is intentionally read, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const selected = new Set(selectedIds);
  const selectable = (results ?? []).filter((c) => c.whatsapp_consent !== false);
  const toggle = (id: string) =>
    onChange(selected.has(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  const selectAllShown = () => onChange([...new Set([...selectedIds, ...selectable.map((c) => c.id)])]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-elevation-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('contactsSearch')}
          aria-label={t('contactsSearch')}
          className="h-9 bg-card pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground" aria-live="polite">
          {t('contactsSelected', { count: selectedIds.length })}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAllShown} disabled={selectable.length === 0}>
            {t('contactsSelectShown')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([])} disabled={selectedIds.length === 0}>
            {t('contactsClear')}
          </Button>
        </div>
      </div>

      {results === null ? (
        <SkeletonRegion label="Loading contacts" className="divide-y divide-border rounded-lg border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 min-w-0 flex-1" />
              <Skeleton className="h-4 w-28 shrink-0 max-[420px]:w-20" />
            </div>
          ))}
        </SkeletonRegion>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('contactsNone')}</p>
      ) : (
        <>
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
            {results.map((c) => {
              const isOn = selected.has(c.id);
              const blocked = c.whatsapp_consent === false;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    disabled={blocked}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/60',
                      blocked && 'cursor-not-allowed opacity-50 hover:bg-transparent'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        isOn ? 'border-foreground bg-foreground text-background' : 'border-border bg-card'
                      )}
                      aria-hidden
                    >
                      {isOn && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{label(c, t('contactsNoName'))}</span>
                    {blocked && <span className="text-xs text-muted-foreground">{t('contactsNoWhatsapp')}</span>}
                    <span className="tabular-nums text-muted-foreground">{c.phone ? `+${c.phone.replace(/^\+/, '')}` : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length >= RESULT_LIMIT && (
            <p className="text-xs text-muted-foreground">{t('contactsMore', { count: RESULT_LIMIT })}</p>
          )}
        </>
      )}

      {selectedIds.length > 0 && (
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto" role="list">
          {selectedIds.map((id) => {
            const c = known[id];
            const name = c ? label(c, t('contactsNoName')) : '…';
            return (
              <span
                key={id}
                role="listitem"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 text-xs font-medium text-background"
              >
                {name}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={t('contactsRemove', { name })}
                  className="-mr-1 rounded-full p-0.5 hover:bg-background/20"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
