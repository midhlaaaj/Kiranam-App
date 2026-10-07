'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Radio, Search } from 'lucide-react';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { Broadcast } from '@/types/whatsapp';
import { Button } from '@/components/whatsapp/ui/button';
import { Input } from '@/components/whatsapp/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/whatsapp/ui/table';
import { useCan } from '@/hooks/whatsapp/use-can';
import { GatedButton } from '@/components/whatsapp/ui/gated-button';
import { getBroadcastStatus } from '@/lib/whatsapp/broadcast-status';
import { templateDisplayName } from '@/lib/whatsapp/template-display';
import { cn } from '@/lib/whatsapp/utils';

/** Poll cadence while any broadcast is sending (counts come from the
 * aggregate trigger in migration 003; we just re-read the snapshot). */
const POLL_INTERVAL_MS = 5_000;
const PAGE_SIZE = 25;

type StatusTab = 'all' | 'sending' | 'sent' | 'failed' | 'draft';

function percent(numerator: number, denominator: number): number {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function RateCell({ value, total }: { value: number; total: number }) {
  const pct = percent(value, total);
  return (
    <div className="flex items-center gap-2" title={`${value} of ${total}`}>
      <span className="w-10 text-right text-xs tabular-nums text-foreground">{pct}%</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-1.5 rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

export default function BroadcastsPage() {
  const router = useRouter();
  const t = useTranslations('Broadcasts.page');
  const tStatus = useTranslations('Broadcasts.status');
  const canCreate = useCan('send-messages');
  const [broadcasts, setBroadcasts] = useState<Broadcast[] | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    const { data, error: fetchError } = await createClient()
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(true);
      return;
    }
    setError(false);
    setBroadcasts(data ?? []);
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const anySending = useMemo(() => (broadcasts ?? []).some((b) => b.status === 'sending'), [broadcasts]);

  useEffect(() => {
    const start = () => {
      if (!pollTimer.current) pollTimer.current = setInterval(fetchBroadcasts, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
    // Pause while the tab is hidden; refresh immediately on return.
    const onVisibility = () => {
      if (!anySending) return;
      if (document.visibilityState === 'hidden') stop();
      else {
        fetchBroadcasts();
        start();
      }
    };
    if (anySending && document.visibilityState === 'visible') start();
    else stop();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [anySending, fetchBroadcasts]);

  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = { all: 0, sending: 0, sent: 0, failed: 0, draft: 0 };
    for (const b of broadcasts ?? []) {
      c.all++;
      if (b.status in c) c[b.status as StatusTab]++;
    }
    return c;
  }, [broadcasts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (broadcasts ?? []).filter(
      (b) =>
        (tab === 'all' || b.status === tab) &&
        (!q || b.name.toLowerCase().includes(q) || b.template_name.toLowerCase().includes(q))
    );
  }, [broadcasts, tab, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const tabs: StatusTab[] = ['all', 'sending', 'sent', 'failed', 'draft'];

  const newButton = (
    <GatedButton canAct={canCreate} gateReason="create broadcasts" onClick={() => router.push('/whatsapp/broadcasts/new')}>
      <Plus className="h-4 w-4" aria-hidden />
      {t('newBroadcast')}
    </GatedButton>
  );

  return (
    <div className="space-y-6">
      {anySending && (
        <div role="progressbar" aria-label="Broadcast in progress" className="fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-muted">
          <div className="h-0.5 w-1/3 animate-[broadcast-slide_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-foreground motion-reduce:animate-none" />
          <style>{`@keyframes broadcast-slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {newButton}
      </div>

      {error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-foreground">{t('errorLoad')}</p>
          <Button variant="outline" onClick={fetchBroadcasts}>
            {t('retry')}
          </Button>
        </div>
      ) : broadcasts === null ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading broadcasts">
          <div className="h-9 w-80 animate-pulse rounded-full bg-muted" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/70" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-12 text-center">
          <Radio className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">{t('noBroadcastsYet')}</p>
          <p className="text-sm text-muted-foreground">{t('createFirst')}</p>
          <div className="mt-3">{newButton}</div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
              {tabs
                .filter((s) => s === 'all' || counts[s] > 0)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={tab === s}
                    onClick={() => {
                      setTab(s);
                      setPage(1);
                    }}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition',
                      tab === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {s === 'all' ? 'All' : tStatus(s)}
                    <span className="tabular-nums text-xs text-muted-foreground">{counts[s]}</span>
                  </button>
                ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or template"
                aria-label="Search broadcasts"
                className="h-9 pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-foreground">No broadcasts match these filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setTab('all');
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('table.template')}</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">{t('table.recipients')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('table.delivery')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('table.read')}</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Failed</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="hidden sm:table-cell">Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((b) => {
                    const status = getBroadcastStatus(b.status);
                    return (
                      <TableRow key={b.id} className="border-border">
                        <TableCell className="font-medium">
                          <Link href={`/whatsapp/broadcasts/${b.id}`} className="text-foreground underline-offset-2 hover:underline">
                            {b.name}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{templateDisplayName(b.template_name)}</TableCell>
                        <TableCell className="hidden text-right tabular-nums text-foreground sm:table-cell">
                          {b.total_recipients.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <RateCell value={b.delivered_count} total={b.total_recipients} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <RateCell value={b.read_count} total={b.total_recipients} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            'hidden text-right tabular-nums sm:table-cell',
                            b.failed_count > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {b.failed_count.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', status.classes)}>
                            {status.pulse && (
                              <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
                            )}
                            {tStatus(status.label)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                          {b.status === 'draft' ? '—' : dateFmt.format(new Date(b.created_at))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {pageCount > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString('en-IN')}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length).toLocaleString('en-IN')} of{' '}
                {filtered.length.toLocaleString('en-IN')}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                  Next
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
