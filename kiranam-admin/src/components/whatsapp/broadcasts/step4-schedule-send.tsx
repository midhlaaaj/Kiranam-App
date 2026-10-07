'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { MessageTemplate, Tag } from '@/types/whatsapp';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { Button } from '@/components/whatsapp/ui/button';
import { Input } from '@/components/whatsapp/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TemplatePreview, fillPlaceholders } from '@/components/whatsapp/template-preview';
import type { AudienceConfig } from '@/lib/whatsapp/broadcast-audience';
import type { VariableMapping } from '@/hooks/whatsapp/use-broadcast-sending';
import { AudienceSummary, audienceKey } from './audience-summary';
import { languageName } from '@/lib/whatsapp/language-names';

interface Step4Props {
  name: string;
  onNameChange: (name: string) => void;
  template: MessageTemplate;
  audience: AudienceConfig;
  variables: Record<string, VariableMapping>;
  headerMediaUrl?: string;
  onSend: () => void;
  onBack: () => void;
  isProcessing: boolean;
  sentSoFar: number;
  totalToSend: number;
}

const FIELD_LABEL: Record<string, string> = { name: 'Name', phone: 'Phone', email: 'Email', company: 'Company' };

/** Placeholder values for the review preview: static text as-is, per-contact
 * fields as a readable token, e.g. "[Name]". */
function previewValues(variables: Record<string, VariableMapping>) {
  return Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [
      k,
      v.type === 'static' ? v.value : v.type === 'field' ? `[${FIELD_LABEL[v.value] ?? v.value}]` : '[custom field]',
    ])
  );
}

function useCostEstimate(category: string) {
  const [rate, setRate] = useState<{ perMessage: number; currency: string } | null | 'unavailable'>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/whatsapp/whatsapp/usage?days=30')
      .then((r) => r.json())
      .then((json: { available?: boolean; currency?: string | null; byCategory?: { category: string; conversations: number; cost: number }[] }) => {
        if (cancelled) return;
        const row = json.byCategory?.find((c) => c.category === category.toLowerCase());
        if (!json.available || !row || !row.conversations) setRate('unavailable');
        else setRate({ perMessage: row.cost / row.conversations, currency: json.currency || 'INR' });
      })
      .catch(() => !cancelled && setRate('unavailable'));
    return () => {
      cancelled = true;
    };
  }, [category]);
  return rate;
}

export function Step4ScheduleSend({
  name,
  onNameChange,
  template,
  audience,
  variables,
  headerMediaUrl,
  onSend,
  onBack,
  isProcessing,
  sentSoFar,
  totalToSend,
}: Step4Props) {
  const t = useTranslations('Broadcasts.wizard');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [count, setCount] = useState<{ value: number; key: string } | null>(null);
  const [tagNames, setTagNames] = useState<Record<string, string>>({});
  const rate = useCostEstimate(template.category);

  const currentKey = audienceKey(audience);
  const recipients = count?.key === currentKey ? count.value : null;
  const values = previewValues(variables);

  useEffect(() => {
    const ids = [...(audience.tagIds ?? []), ...(audience.excludeTagIds ?? [])];
    if (!ids.length) return;
    createClient()
      .from('tags')
      .select('id, name')
      .in('id', ids)
      .then(({ data }) => setTagNames(Object.fromEntries(((data ?? []) as Pick<Tag, 'id' | 'name'>[]).map((x) => [x.id, x.name]))));
  }, [audience.tagIds, audience.excludeTagIds]);

  // A send runs from this tab — closing it mid-way would stop it.
  useEffect(() => {
    if (!isProcessing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isProcessing]);

  const audienceDescription =
    audience.type === 'all'
      ? t('scheduleSend.audienceAll')
      : audience.type === 'tags'
        ? `Tagged ${(audience.tagIds ?? []).map((id) => tagNames[id] ?? '…').join(', ')}`
        : audience.type === 'csv'
          ? t('scheduleSend.audienceCsv')
          : t('scheduleSend.audienceField');
  const excluded = (audience.excludeTagIds ?? []).map((id) => tagNames[id] ?? '…');

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);

  const canSend = !!name.trim() && recipients !== null && recipients > 0 && !isProcessing;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('scheduleSend.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Check everything below — a sent broadcast can’t be recalled.</p>
      </div>

      <div>
        <label htmlFor="broadcast-name" className="mb-1.5 block text-sm font-medium text-foreground">
          {t('scheduleSend.broadcastName')}
        </label>
        <Input
          id="broadcast-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('scheduleSend.broadcastNamePlaceholder')}
          aria-describedby="broadcast-name-hint"
        />
        <p id="broadcast-name-hint" className="mt-1 text-xs text-muted-foreground">
          Only your team sees this name.
        </p>
      </div>

      <ol className="space-y-4">
        <li className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">1. The message</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Template <span className="font-medium text-foreground">{template.name}</span> · {template.category} ·{' '}
            {languageName(template.language)}. Words in [brackets] are filled in per person.
          </p>
          <TemplatePreview
            className="mt-3"
            headerType={template.header_type}
            headerText={template.header_content ? fillPlaceholders(template.header_content, values) : null}
            headerMediaUrl={headerMediaUrl || template.header_media_url}
            body={fillPlaceholders(template.body_text, values)}
            footer={template.footer_text}
            buttons={template.buttons}
          />
        </li>

        <li className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">2. Who receives it</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {audienceDescription}
              {excluded.length > 0 && <> · excluding {excluded.join(', ')}</>}
            </p>
          </div>
          <AudienceSummary audience={audience} onCount={(value, key) => setCount({ value, key })} />
        </li>

        <li className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">3. Estimated cost</p>
          <p className="mt-1 text-sm text-foreground">
            {rate === null || recipients === null ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Estimating…
              </span>
            ) : rate === 'unavailable' ? (
              <span className="text-muted-foreground">
                Meta bills each delivered {template.category.toLowerCase()} message to your WhatsApp account. There isn’t
                enough recent spend data here to estimate this one.
              </span>
            ) : (
              <>
                About <span className="font-semibold">{fmt(rate.perMessage * recipients, rate.currency)}</span>{' '}
                <span className="text-muted-foreground">
                  ({recipients.toLocaleString('en-IN')} × ~{fmt(rate.perMessage, rate.currency)}, based on your last 30 days of{' '}
                  {template.category.toLowerCase()} messages)
                </span>
              </>
            )}
          </p>
        </li>
      </ol>

      {isProcessing && (
        <div role="status" className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {totalToSend
                ? `Sending ${sentSoFar.toLocaleString('en-IN')} of ${totalToSend.toLocaleString('en-IN')}…`
                : 'Preparing recipients…'}
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-foreground transition-all duration-300"
              style={{ width: `${totalToSend ? Math.round((sentSoFar / totalToSend) * 100) : 5}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">Keep this tab open until it finishes — closing it stops the send.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('back')}
        </Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={!canSend}>
          <Send className="h-4 w-4" aria-hidden />
          {recipients === null ? t('scheduleSend.sendNow') : `Send to ${recipients.toLocaleString('en-IN')} people`}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Send to ${recipients?.toLocaleString('en-IN') ?? '…'} people now?`}
        description={`“${template.name}” goes out on WhatsApp immediately. It can’t be unsent.`}
        consequences={[
          'Keep this tab open until sending finishes',
          ...(rate && rate !== 'unavailable' && recipients
            ? [`Cost roughly ${fmt(rate.perMessage * recipients, rate.currency)}, billed by Meta`]
            : []),
        ]}
        confirmLabel={`Send to ${recipients?.toLocaleString('en-IN') ?? ''} people`}
        onConfirm={() => {
          setConfirmOpen(false);
          onSend();
        }}
      />
    </div>
  );
}
