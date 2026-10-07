'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check, FileUp, Filter, Loader2, Tags, Upload, Users } from 'lucide-react';
import { createClient } from '@/lib/whatsapp/supabase/client';
import { CustomField, Tag } from '@/types/whatsapp';
import { Button } from '@/components/whatsapp/ui/button';
import { Input } from '@/components/whatsapp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/whatsapp/ui/select';
import { cn } from '@/lib/whatsapp/utils';
import {
  isAudienceComplete,
  type AudienceConfig,
  type CustomFieldFilter,
  type CustomFieldOperator,
} from '@/lib/whatsapp/broadcast-audience';
import { AudienceSummary } from './audience-summary';

type AudienceType = AudienceConfig['type'];

interface Step2Props {
  audience: AudienceConfig;
  onUpdate: (audience: AudienceConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

// ─── CSV parsing ───────────────────────────────────────────────────────────

interface CsvResult {
  fileName: string;
  valid: { phone: string; name?: string }[];
  rejected: { row: number; value: string }[];
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Stored contact phones are digits-only with country code ("919846571425"). */
function normalizePhone(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw, 'IN');
  return parsed?.isValid() ? parsed.number.replace(/^\+/, '') : null;
}

function parseCsv(text: string, fileName: string): CsvResult | { error: 'parse' | 'missingPhone' } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { error: 'parse' };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  let phoneCol = header.findIndex((h) => /phone|mobile|number|whatsapp/.test(h));
  let nameCol = header.findIndex((h) => /name/.test(h));
  let dataStart = 1;
  if (phoneCol === -1) {
    // Headerless file: accept it if the first column already looks like phones.
    if (normalizePhone(splitCsvLine(lines[0])[0] ?? '')) {
      phoneCol = 0;
      nameCol = splitCsvLine(lines[0]).length > 1 ? 1 : -1;
      dataStart = 0;
    } else return { error: 'missingPhone' };
  }
  const valid: CsvResult['valid'] = [];
  const rejected: CsvResult['rejected'] = [];
  const seen = new Set<string>();
  for (let i = dataStart; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const phone = normalizePhone(cols[phoneCol] ?? '');
    if (!phone) {
      rejected.push({ row: i + 1, value: cols[phoneCol] ?? '' });
      continue;
    }
    if (seen.has(phone)) continue;
    seen.add(phone);
    valid.push({ phone, name: nameCol >= 0 ? cols[nameCol] || undefined : undefined });
  }
  return { fileName, valid, rejected };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function Step2SelectAudience({ audience, onUpdate, onNext, onBack }: Step2Props) {
  const t = useTranslations('Broadcasts.wizard');
  const [tags, setTags] = useState<Tag[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[] | null>(null);
  // Restored from the wizard's audience when coming Back to this step.
  const [csv, setCsv] = useState<CsvResult | null>(() =>
    audience.csvContacts?.length ? { fileName: 'Uploaded file', valid: audience.csvContacts, rejected: [] } : null
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const options = useMemo<{ type: AudienceType; label: string; description: string; icon: typeof Users }[]>(
    () => [
      { type: 'all', label: t('selectAudience.method.all'), description: t('selectAudience.allDescLoading'), icon: Users },
      { type: 'tags', label: t('selectAudience.method.tags'), description: t('selectAudience.tagDesc'), icon: Tags },
      { type: 'custom_field', label: t('selectAudience.method.customField'), description: t('selectAudience.customFieldDesc'), icon: Filter },
      { type: 'csv', label: t('selectAudience.method.csv'), description: t('selectAudience.csvDesc'), icon: Upload },
    ],
    [t]
  );

  const operatorItems: Record<CustomFieldOperator, string> = {
    is: t('selectAudience.operatorIs'),
    is_not: t('selectAudience.operatorIsNot'),
    contains: t('selectAudience.operatorContains'),
  };

  // Tags feed both the "Filter by tags" audience and the exclude list.
  useEffect(() => {
    createClient()
      .from('tags')
      .select('*')
      .order('name')
      .then(({ data }) => setTags(data ?? []));
  }, []);

  useEffect(() => {
    if (audience.type !== 'custom_field' || customFields !== null) return;
    createClient()
      .from('custom_fields')
      .select('*')
      .order('field_name')
      .then(({ data }) => setCustomFields(data ?? []));
  }, [audience.type, customFields]);

  function selectType(type: AudienceType) {
    // Drop config belonging to other types so nothing stale leaks across.
    onUpdate({
      ...audience,
      type,
      tagIds: type === 'tags' ? audience.tagIds : undefined,
      customField: type === 'custom_field' ? audience.customField : undefined,
      csvContacts: type === 'csv' ? audience.csvContacts : undefined,
    });
  }

  function toggle(list: 'tagIds' | 'excludeTagIds', tagId: string) {
    const current = audience[list] ?? [];
    onUpdate({ ...audience, [list]: current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId] });
  }

  function updateRule(patch: Partial<CustomFieldFilter>) {
    const prev = audience.customField ?? { fieldId: '', operator: 'is' as CustomFieldOperator, value: '' };
    onUpdate({ ...audience, customField: { ...prev, ...patch } });
  }

  async function onPickCsv(file: File | undefined) {
    if (!file) return;
    setCsvError(null);
    const result = parseCsv(await file.text(), file.name);
    if ('error' in result) {
      setCsv(null);
      setCsvError(result.error === 'missingPhone' ? t('selectAudience.errorCsvMissingPhone') : t('selectAudience.errorCsvParse'));
      onUpdate({ ...audience, csvContacts: undefined });
      return;
    }
    setCsv(result);
    onUpdate({ ...audience, csvContacts: result.valid });
  }

  const fieldItems = Object.fromEntries((customFields ?? []).map((f) => [f.id, f.field_name]));
  const tagChip = (selected: boolean) =>
    cn(
      'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition',
      selected
        ? 'border-foreground bg-foreground text-background'
        : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('selectAudience.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('selectAudience.subtitle')}</p>
      </div>

      <div role="radiogroup" aria-label={t('selectAudience.title')} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = audience.type === option.type;
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectType(option.type)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                selected ? 'border-foreground bg-card ring-1 ring-foreground' : 'border-border bg-card hover:border-foreground/40'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  selected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {audience.type === 'tags' && (
        <fieldset className="rounded-xl border border-border bg-card p-4">
          <legend className="sr-only">{t('selectAudience.selectTags')}</legend>
          <p className="mb-3 text-sm font-medium text-foreground">{t('selectAudience.selectTags')}</p>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('selectAudience.noTagsFound')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = !!audience.tagIds?.includes(tag.id);
                return (
                  <button key={tag.id} type="button" aria-pressed={selected} onClick={() => toggle('tagIds', tag.id)} className={tagChip(selected)}>
                    {selected ? <Check className="h-3 w-3" aria-hidden /> : <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      )}

      {audience.type === 'custom_field' && (
        <div className="rounded-xl border border-border bg-card p-4">
          {customFields === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading fields" />
          ) : customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('selectAudience.errorLoadFields')}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <span className="pb-2 text-sm font-medium text-foreground">{t('selectAudience.ruleIntro')}</span>
              <label className="grid min-w-40 flex-1 gap-1 text-xs text-muted-foreground">
                {t('selectAudience.field')}
                <Select items={fieldItems} value={audience.customField?.fieldId || null} onValueChange={(v) => updateRule({ fieldId: String(v ?? '') })}>
                  <SelectTrigger className="h-9 w-full bg-card text-foreground">
                    <SelectValue placeholder={t('selectAudience.selectField')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.field_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid w-32 gap-1 text-xs text-muted-foreground">
                {t('selectAudience.operator')}
                <Select
                  items={operatorItems}
                  value={audience.customField?.operator ?? 'is'}
                  onValueChange={(v) => updateRule({ operator: v as CustomFieldOperator })}
                >
                  <SelectTrigger className="h-9 w-full bg-card text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(operatorItems) as CustomFieldOperator[]).map((op) => (
                      <SelectItem key={op} value={op}>
                        {operatorItems[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid min-w-40 flex-1 gap-1 text-xs text-muted-foreground">
                {t('selectAudience.value')}
                <Input
                  value={audience.customField?.value ?? ''}
                  onChange={(e) => updateRule({ value: e.target.value })}
                  placeholder={t('selectAudience.valuePlaceholder')}
                  className="h-9 bg-card"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {audience.type === 'csv' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              onPickCsv(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {!csv ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition hover:border-foreground/40"
            >
              <FileUp className="h-6 w-6 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium text-foreground">{t('selectAudience.csvChoose')}</span>
              <span className="max-w-sm text-xs text-muted-foreground">{t('selectAudience.csvHint')}</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{csv.fileName}</span> ·{' '}
                  <span className="font-semibold">{t('selectAudience.csvValid', { count: csv.valid.length })}</span>
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  {t('selectAudience.csvReplace')}
                </Button>
              </div>
              {csv.rejected.length > 0 && (
                <details className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground">
                  <summary className="cursor-pointer">{t('selectAudience.csvRejected', { count: csv.rejected.length })}</summary>
                  <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
                    {csv.rejected.slice(0, 20).map((r) => (
                      <li key={r.row}>
                        Row {r.row}: “{r.value || 'empty'}”
                      </li>
                    ))}
                    {csv.rejected.length > 20 && <li>…and {csv.rejected.length - 20} more</li>}
                  </ul>
                </details>
              )}
              {csv.valid.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {csv.valid.slice(0, 5).map((r) => (
                    <li key={r.phone} className="flex justify-between gap-3 px-3 py-1.5">
                      <span className="truncate text-foreground">{r.name || '—'}</span>
                      <span className="tabular-nums text-muted-foreground">+{r.phone}</span>
                    </li>
                  ))}
                  {csv.valid.length > 5 && (
                    <li className="px-3 py-1.5 text-xs text-muted-foreground">+ {csv.valid.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
          {csvError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {csvError}
            </p>
          )}
        </div>
      )}

      <fieldset className="rounded-xl border border-border bg-card p-4">
        <legend className="sr-only">{t('selectAudience.excludeTags')}</legend>
        <p className="text-sm font-medium text-foreground">{t('selectAudience.excludeTags')}</p>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{t('selectAudience.excludeHint')}</p>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('selectAudience.noTagsFound')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const excluded = !!audience.excludeTagIds?.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={excluded}
                  onClick={() => toggle('excludeTagIds', tag.id)}
                  className={cn(tagChip(excluded), excluded && 'line-through decoration-background/60')}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden />
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <AudienceSummary audience={audience} />

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('back')}
        </Button>
        <Button onClick={onNext} disabled={!isAudienceComplete(audience)}>
          {t('next')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
