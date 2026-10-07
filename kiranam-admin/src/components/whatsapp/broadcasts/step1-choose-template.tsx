'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, FileText, Search } from 'lucide-react';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { MessageTemplate } from '@/types/whatsapp';
import { Button } from '@/components/whatsapp/ui/button';
import { Input } from '@/components/whatsapp/ui/input';
import { cn } from '@/lib/whatsapp/utils';
import { languageName } from '@/lib/whatsapp/language-names';
import { TEMPLATE_CATEGORY_INFO, templateDisplayName } from '@/lib/whatsapp/template-display';

interface Step1Props {
  selectedTemplate: MessageTemplate | null;
  onSelect: (template: MessageTemplate) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step1ChooseTemplate({ selectedTemplate, onSelect, onNext, onBack }: Step1Props) {
  const t = useTranslations('Broadcasts.wizard');
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(false);
    setTemplates(null);
    const supabase = createClient();
    // Only APPROVED templates can be sent — anything else 400s at Meta.
    const [approved, pending] = await Promise.all([
      supabase.from('message_templates').select('*').eq('status', 'APPROVED').order('created_at', { ascending: false }),
      supabase.from('message_templates').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    ]);
    if (approved.error) {
      setError(true);
      return;
    }
    setTemplates(approved.data ?? []);
    setPendingCount(pending.count ?? 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!templates || !q) return templates ?? [];
    return templates.filter(
      (tpl) => templateDisplayName(tpl.name).toLowerCase().includes(q) || tpl.body_text.toLowerCase().includes(q)
    );
  }, [templates, query]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('chooseTemplate.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('chooseTemplate.subtitle')}</p>
      </div>

      {error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-foreground">{t('chooseTemplate.errorLoad')}</p>
          <Button variant="outline" onClick={load}>
            Try again
          </Button>
        </div>
      ) : templates === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading templates">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-muted/60" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">No approved templates yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} ${pendingCount === 1 ? 'template is' : 'templates are'} waiting for Meta’s approval — usually a few minutes to a few hours.`
              : 'Broadcasts can only use templates Meta has approved. Create one first.'}
          </p>
          <Link
            href="/whatsapp/templates"
            className="mt-2 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to Templates
          </Link>
        </div>
      ) : (
        <>
          {templates.length > 6 && (
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="pl-9"
              />
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No templates match “{query}”.
            </p>
          ) : (
            <div role="radiogroup" aria-label={t('chooseTemplate.title')} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((template) => {
                const selected = selectedTemplate?.id === template.id;
                const category = TEMPLATE_CATEGORY_INFO[template.category];
                return (
                  <button
                    key={template.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onSelect(template)}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition',
                      selected ? 'border-foreground ring-1 ring-foreground' : 'border-border hover:border-foreground/40'
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{templateDisplayName(template.name)}</span>
                      <span
                        className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        title={category?.hint}
                      >
                        {category?.label ?? template.category}
                      </span>
                    </span>
                    <span className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{template.body_text}</span>
                    <span className="text-xs text-muted-foreground">{languageName(template.language)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {selectedTemplate && TEMPLATE_CATEGORY_INFO[selectedTemplate.category] && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{selectedTemplate.category}:</span>{' '}
              {TEMPLATE_CATEGORY_INFO[selectedTemplate.category].hint}
            </p>
          )}
        </>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button onClick={onNext} disabled={!selectedTemplate}>
          {t('next')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
