'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { Broadcast, BroadcastRecipient, RecipientStatus } from '@/types/whatsapp';
import { Button } from '@/components/whatsapp/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/whatsapp/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/whatsapp/ui/dropdown-menu';
import {
  ArrowLeft,
  Loader2,
  Users,
  Send,
  CheckCheck,
  Eye,
  AlertCircle,
  MessageCircle,
  Filter,
  Download,
  ChevronDown,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { fetchAllRecipients } from '@/lib/whatsapp/broadcast-audience';
import { failureReason } from '@/lib/whatsapp/meta-errors';
import { templateDisplayName } from '@/lib/whatsapp/template-display';
import { useBroadcastSending } from '@/hooks/whatsapp/use-broadcast-sending';
import { toast } from 'sonner';
import {
  getBroadcastStatus,
  getRecipientStatus,
} from '@/lib/whatsapp/broadcast-status';
import { useTranslations } from 'next-intl';

interface StatCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, total, icon, color }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`} aria-hidden>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

/**
 * Pure-CSS funnel chart: decreasing-width rounded bars.
 * Width is relative to the largest step (typically Sent) so we
 * always render a full bar at the top and proportional tails.
 */
function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">Funnel</h3>
      <div className="space-y-2">
        {steps.map((step) => {
          const pctOfMax = Math.max(5, Math.round((step.value / max) * 100));
          const pctOfSent =
            steps[0].value > 0
              ? Math.round((step.value / steps[0].value) * 100)
              : 0;
          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {step.label}
              </span>
              <div className="relative h-7 flex-1 rounded-full bg-muted">
                <div
                  className={`h-7 rounded-full ${step.color} transition-[width] duration-500`}
                  style={{ width: `${pctOfMax}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-foreground">
                  {step.value.toLocaleString()}
                  <span className="ml-2 text-muted-foreground/80">
                    ({pctOfSent}%)
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});
const fmtTime = (iso: string) => timeFmt.format(new Date(iso));

const RECIPIENT_STATUSES: readonly RecipientStatus[] = [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
  'failed',
];

/**
 * CSV export helper — RFC 4180 quoting. Quote every field so
 * commas/newlines/quotes round-trip cleanly.
 */
function toCsv(rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(escape).join(',')).join('\n');
}

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BroadcastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('Broadcasts.detail');
  const tStatus = useTranslations('Broadcasts.status');
  const broadcastId = params.id as string;

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecipientStatus | 'all'>(
    'all',
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { retryFailed, isProcessing: retrying, sentSoFar, totalToSend } = useBroadcastSending();
  const [confirmRetry, setConfirmRetry] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: bc, error: bcError } = await supabase.from('broadcasts').select('*').eq('id', broadcastId).single();
      if (bcError) throw bcError;
      setBroadcast(bc);
      // Paged — a single select stops at 1000 recipients.
      setRecipients(await fetchAllRecipients<BroadcastRecipient>(supabase, broadcastId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notFound'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Delivered/read counts arrive via webhooks over the following hours —
  // refresh while the broadcast is recent and the tab is visible.
  const createdAt = broadcast?.created_at;
  useEffect(() => {
    if (!createdAt || retrying) return;
    if (Date.now() - new Date(createdAt).getTime() > 24 * 3600 * 1000) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, broadcast?.status === 'sending' ? 5000 : 15000);
    return () => clearInterval(timer);
  }, [createdAt, retrying, broadcast?.status, fetchData]);

  const failureGroups = useMemo(() => {
    const groups = new Map<string, { reason: ReturnType<typeof failureReason>; count: number }>();
    for (const r of recipients) {
      if (r.status !== 'failed') continue;
      const reason = failureReason(r.error_message);
      const g = groups.get(reason.key) ?? { reason, count: 0 };
      g.count++;
      groups.set(reason.key, g);
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }, [recipients]);
  const failedTotal = failureGroups.reduce((n, g) => n + g.count, 0);

  async function handleRetry() {
    setConfirmRetry(false);
    try {
      const { retried, failed } = await retryFailed(broadcastId);
      if (failed === 0) toast.success(`Re-sent to all ${retried}.`);
      else toast.warning(`Re-sent to ${retried - failed} of ${retried}. ${failed} still failed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed.');
    }
    fetchData();
  }

  const filteredRecipients = useMemo(
    () =>
      statusFilter === 'all'
        ? recipients
        : recipients.filter((r) => r.status === statusFilter),
    [recipients, statusFilter],
  );

  function handleExport() {
    if (!broadcast) return;
    const header = [
      t('table.contact'),
      t('table.phone'),
      t('table.status'),
      t('table.sent'),
      t('table.delivered'),
      t('table.read'),
      t('table.error'),
    ];
    const rows = recipients.map((r) => [
      r.contact?.name ?? '',
      r.contact?.phone ?? '',
      r.status,
      r.sent_at ?? '',
      r.delivered_at ?? '',
      r.read_at ?? '',
      r.error_message ?? '',
    ]);
    const csv = toCsv([header, ...rows]);
    const safeName = broadcast.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    downloadBlob(`broadcast-${safeName}-${broadcastId.slice(0, 8)}.csv`, csv);
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    // broadcast_recipients cascades on broadcasts.id (migration 001), so a
    // single delete is sufficient — the aggregate trigger in migration 003
    // is defined on broadcast_recipients but fires only on its own row
    // changes, not on a cascaded drop of the parent row.
    const { error: delErr } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', broadcastId);
    setDeleting(false);
    setConfirmDelete(false);
    if (delErr) {
      toast.error(t('toastFailedDelete', { error: delErr.message }));
      return;
    }
    toast.success(t('toastDeleted'));
    router.push('/whatsapp/broadcasts');
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading broadcast">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/70" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted/70" />
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-destructive">{error ?? t('notFound')}</p>
        <Button variant="outline" onClick={() => router.push('/whatsapp/broadcasts')}>
          {t('backToBroadcasts')}
        </Button>
      </div>
    );
  }

  const status = getBroadcastStatus(broadcast.status);

  const funnelSteps: FunnelStep[] = [
    { label: t('stats.sent'), value: broadcast.sent_count, color: 'bg-foreground/25' },
    { label: t('stats.delivered'), value: broadcast.delivered_count, color: 'bg-foreground/35' },
    { label: t('stats.read'), value: broadcast.read_count, color: 'bg-success/40' },
    { label: t('stats.replied'), value: broadcast.replied_count, color: 'bg-success/60' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/whatsapp/broadcasts')}
            aria-label={t('backToBroadcasts')}
            title={t('backToBroadcasts')}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{broadcast.name}</h1>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
              >
                {tStatus(status.label)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{t('template', { name: templateDisplayName(broadcast.template_name) })}</span>
              <span aria-hidden>·</span>
              <span>
                {new Intl.DateTimeFormat('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'Asia/Kolkata',
                }).format(new Date(broadcast.created_at))}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={broadcast.status === 'sending' || deleting}
          onClick={() => setConfirmDelete(true)}
          title={broadcast.status === 'sending' ? t('cannotDeleteSending') : t('deleteHover')}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {deleting ? t('deleting') : t('delete')}
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this broadcast’s record?"
          description="Messages already sent stay on people’s phones — this only removes the report here."
          consequences={['Remove the delivery and read stats for this broadcast', 'Remove the per-recipient list']}
          confirmLabel="Delete record"
          destructive
          onConfirm={handleDelete}
        />
      </div>

      {/* Stats — 6 cards: Total / Sent / Delivered / Read / Replied / Failed */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label={t('stats.totalRecipients')}
          value={broadcast.total_recipients}
          total={broadcast.total_recipients}
          icon={<Users className="h-4 w-4" />}
          color="bg-muted text-muted-foreground"
        />
        <StatCard
          label={t('stats.sent')}
          value={broadcast.sent_count}
          total={broadcast.total_recipients}
          icon={<Send className="h-4 w-4" />}
          color="bg-info-soft text-info"
        />
        <StatCard
          label={t('stats.delivered')}
          value={broadcast.delivered_count}
          total={broadcast.total_recipients}
          icon={<CheckCheck className="h-4 w-4" />}
          color="bg-success-soft text-success"
        />
        <StatCard
          label={t('stats.read')}
          value={broadcast.read_count}
          total={broadcast.total_recipients}
          icon={<Eye className="h-4 w-4" />}
          color="bg-success-soft text-success"
        />
        <StatCard
          label={t('stats.replied')}
          value={broadcast.replied_count}
          total={broadcast.total_recipients}
          icon={<MessageCircle className="h-4 w-4" />}
          color="bg-success-soft text-success"
        />
        <StatCard
          label={t('stats.failed')}
          value={broadcast.failed_count}
          total={broadcast.total_recipients}
          icon={<AlertCircle className="h-4 w-4" />}
          color="bg-destructive/10 text-destructive"
        />
      </div>

      {(failedTotal > 0 || retrying) && (
        <section aria-labelledby="failures-heading" className="rounded-xl border border-destructive/30 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="failures-heading" className="text-sm font-semibold text-foreground">
                {failedTotal.toLocaleString('en-IN')} {failedTotal === 1 ? 'person' : 'people'} didn’t get this
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Grouped by reason. Retrying only re-sends to these people.</p>
            </div>
            <Button variant="outline" onClick={() => setConfirmRetry(true)} disabled={retrying || broadcast.status === 'sending'}>
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
              {retrying
                ? totalToSend
                  ? `Retrying ${sentSoFar} of ${totalToSend}…`
                  : 'Preparing…'
                : `Retry failed (${failedTotal.toLocaleString('en-IN')})`}
            </Button>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {failureGroups.map(({ reason, count }) => (
              <li key={reason.key} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-foreground">{reason.title}</p>
                  <p className="text-muted-foreground">{reason.advice}</p>
                </div>
                <span className="shrink-0 tabular-nums font-semibold text-foreground">{count.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
          <ConfirmDialog
            open={confirmRetry}
            onOpenChange={setConfirmRetry}
            title={`Re-send to ${failedTotal.toLocaleString('en-IN')} ${failedTotal === 1 ? 'person' : 'people'}?`}
            description="Only people whose message failed get it again — nobody receives it twice."
            consequences={[
              'Keep this tab open until it finishes',
              ...(failureGroups.some((g) => !g.reason.retryable)
                ? ['Some failures (e.g. not on WhatsApp, opted out) will fail again']
                : []),
            ]}
            confirmLabel="Re-send"
            onConfirm={handleRetry}
          />
        </section>
      )}

      <FunnelChart steps={funnelSteps} />

      {/* Recipients Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">
            {statusFilter !== 'all'
              ? t('recipientsHeader', { filtered: filteredRecipients.length, total: recipients.length })
              : t('recipientsHeaderAll', { total: recipients.length })}
          </h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:bg-muted"
                  />
                }
              >
                <Filter className="h-3.5 w-3.5" />
                {statusFilter === 'all'
                  ? t('allStatuses')
                  : tStatus(getRecipientStatus(statusFilter).label)}
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-border bg-popover">
                <DropdownMenuItem
                  onClick={() => setStatusFilter('all')}
                  className={statusFilter === 'all' ? 'font-semibold text-foreground' : 'text-popover-foreground'}
                >
                  {t('allStatuses')}
                </DropdownMenuItem>
                {RECIPIENT_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={statusFilter === s ? 'font-semibold text-foreground' : 'text-popover-foreground'}
                  >
                    {tStatus(getRecipientStatus(s).label)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={recipients.length === 0}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              {t('exportCsv')}
            </Button>
          </div>
        </div>

        {filteredRecipients.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {recipients.length === 0
                ? t('noRecipients')
                : t('noRecipientsFilter')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">{t('table.contact')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('table.phone')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('table.status')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('table.sent')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('table.delivered')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('table.read')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('table.error')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((recipient) => {
                  const rStatus = getRecipientStatus(recipient.status);
                  return (
                    <TableRow key={recipient.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {recipient.contact?.name ?? 'Unknown'}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {recipient.contact?.phone ? `+${recipient.contact.phone.replace(/^\+/, '')}` : '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${rStatus.classes}`}
                        >
                          {tStatus(rStatus.label)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.sent_at ? fmtTime(recipient.sent_at) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.delivered_at ? fmtTime(recipient.delivered_at) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.read_at ? fmtTime(recipient.read_at) : '—'}
                      </TableCell>
                      <TableCell className="max-w-xs text-xs">
                        {recipient.error_message ? (
                          <details>
                            <summary className="cursor-pointer text-destructive">
                              {failureReason(recipient.error_message).title}
                            </summary>
                            <p className="mt-1 break-words font-mono text-muted-foreground">{recipient.error_message}</p>
                          </details>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
