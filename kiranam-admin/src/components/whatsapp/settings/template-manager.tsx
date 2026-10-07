'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  Pencil,
  RotateCcw,
  Search,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PreviewImage } from '@/components/ImageLightbox';
import { TemplatePreview, fillPlaceholders } from '@/components/whatsapp/template-preview';
import { TEMPLATE_CATEGORY_INFO, templateDisplayName } from '@/lib/whatsapp/template-display';
import { languageName } from '@/lib/whatsapp/language-names';
import { createClient } from '@/lib/whatsapp/supabase/client';
import {
  uploadAccountMedia,
  MEDIA_MAX_BYTES_BY_KIND,
} from '@/lib/whatsapp/storage/upload-media';
import { useAuth } from '@/hooks/whatsapp/use-auth';
import { Button } from '@/components/whatsapp/ui/button';
import { Input } from '@/components/whatsapp/ui/input';
import { Label } from '@/components/whatsapp/ui/label';
import { Textarea } from '@/components/whatsapp/ui/textarea';
import { Badge } from '@/components/whatsapp/ui/badge';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/whatsapp/ui/card';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/whatsapp/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/whatsapp/ui/select';
import type {
  MessageTemplate,
  TemplateButton,
  TemplateSampleValues,
} from '@/types/whatsapp';
import { templateStatusConfig } from '@/lib/whatsapp/template-status';
import {
  extractVariableIndices,
  TEMPLATE_LIMITS,
  validateBody,
  validateButtons,
  validateFooter,
  validateHeader,
  validateSampleValues,
  validateTemplateName,
  type TemplatePayload,
} from '@/lib/whatsapp/whatsapp/template-validators';

const CATEGORIES = ['Marketing', 'Utility', 'Authentication'] as const;
type HeaderFormat = 'none' | 'text' | 'image' | 'video' | 'document';
const HEADER_FORMATS: HeaderFormat[] = ['none', 'text', 'image', 'video', 'document'];

// Meta's rejection enums → what an admin should change.
const REJECTION_HELP: Record<string, string> = {
  INVALID_FORMAT: 'The format broke a Meta rule — check the blanks ({{1}}…), buttons and length.',
  TAG_CONTENT_MISMATCH: 'Meta thinks the category is wrong. Promotional wording belongs in Marketing.',
  INCORRECT_CATEGORY: 'Meta thinks the category is wrong. Promotional wording belongs in Marketing.',
  PROMOTIONAL: 'It reads as promotional. Submit it as Marketing, or remove the appeal wording.',
  ABUSIVE_CONTENT: 'Meta flagged the wording as against its policies. Rephrase it.',
  SCAM: 'Meta flagged it as possibly misleading. Avoid urgency and payment links in the first message.',
  INVALID_VARIABLES: 'A blank ({{1}}…) is placed wrongly — not at the very start or end, and not two in a row.',
};

function rejectionHelp(reason: string | undefined) {
  if (!reason) return null;
  const key = reason.trim().toUpperCase().replace(/\s+/g, '_');
  return REJECTION_HELP[key] ?? null;
}

const QUALITY_LABEL: Record<string, { text: string; className: string }> = {
  GREEN: { text: 'Quality: high', className: 'text-success' },
  YELLOW: { text: 'Quality: medium — people may be blocking or reporting it', className: 'text-warning' },
  RED: { text: 'Quality: low — Meta may pause this template', className: 'text-destructive' },
};

type StatusTab = 'all' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'other';

/** Every validator, run separately so the editor can list all problems at once. */
function collectIssues(payload: TemplatePayload, bodyVarCount: number, headerVarCount: number): string[] {
  const issues: string[] = [];
  const run = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      if (e instanceof Error) issues.push(e.message);
    }
  };
  run(() => validateTemplateName(payload.name));
  run(() => validateBody(payload.body_text));
  run(() => validateFooter(payload.footer_text));
  run(() => validateHeader(payload));
  run(() => validateButtons(payload.buttons));
  run(() => validateSampleValues(payload, bodyVarCount, headerVarCount));
  return issues;
}

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs tabular-nums ${value.length >= max ? 'text-destructive' : 'text-muted-foreground'}`}>
      {value.length}/{max}
    </span>
  );
}

interface TemplateFormData {
  name: string;
  category: MessageTemplate['category'];
  language: string;
  header_format: HeaderFormat;
  header_content: string;
  header_media_url: string;
  header_sample: string;
  body_text: string;
  body_samples: string[];
  footer_text: string;
  buttons: TemplateButton[];
}

const emptyForm: TemplateFormData = {
  name: '',
  category: 'Marketing',
  language: 'en_US',
  header_format: 'none',
  header_content: '',
  header_media_url: '',
  header_sample: '',
  body_text: '',
  body_samples: [],
  footer_text: '',
  buttons: [],
};

const LANGUAGE_OPTIONS = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'en', label: 'English' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'es', label: 'Spanish' },
  { code: 'es_ES', label: 'Spanish (Spain)' },
  { code: 'es_MX', label: 'Spanish (Mexico)' },
  { code: 'fr', label: 'French' },
  { code: 'fr_FR', label: 'French (France)' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' },
  { code: 'pt_PT', label: 'Portuguese (Portugal)' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'lt', label: 'Lithuanian' },
];

function emptyButton(type: TemplateButton['type']): TemplateButton {
  switch (type) {
    case 'QUICK_REPLY':
      return { type: 'QUICK_REPLY', text: '' };
    case 'URL':
      return { type: 'URL', text: '', url: '' };
    case 'PHONE_NUMBER':
      return { type: 'PHONE_NUMBER', text: '', phone_number: '' };
    case 'COPY_CODE':
      return { type: 'COPY_CODE', text: '', example: '' };
  }
}

export function TemplateManager() {
  const t = useTranslations('Settings.templates');
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  // user_id → display name, for "Created by" on each card.
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);
  // Non-null when the dialog is editing an existing row — switches the
  // submit handler from POST /submit to PATCH /[id] and changes the
  // dialog title + CTA. Set to the template id to pre-fill from a row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  // Snapshot of the form when the dialog opened — closing with changes asks first.
  const [initialForm, setInitialForm] = useState<TemplateFormData>(emptyForm);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [attempted, setAttempted] = useState(false);
  // Template selected for the confirm-delete dialog. The destructive
  // action goes through this two-step so a slip on the trash icon
  // doesn't take the template off Meta as well as locally.
  const [templateToDelete, setTemplateToDelete] =
    useState<MessageTemplate | null>(null);
  // Header-image upload (issue #230). Uploads to the account-scoped
  // chat-media bucket and stores the public URL in header_media_url; the
  // submit route turns that into a Meta Resumable-Upload handle.
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const headerFileRef = useRef<HTMLInputElement>(null);

  // Body variable indices — `[1, 2, 3]` for "{{1}} {{2}} {{3}}". We
  // re-run the extractor on every render to keep the sample-value rows
  // in sync with what the user typed.
  const bodyVarCount = useMemo(
    () => extractVariableIndices(form.body_text).length,
    [form.body_text],
  );
  const headerVarCount = useMemo(
    () =>
      form.header_format === 'text'
        ? extractVariableIndices(form.header_content).length
        : 0,
    [form.header_format, form.header_content],
  );

  // Resize body_samples so it always has exactly bodyVarCount entries.
  // (We mutate via setForm in an effect so React owns the state.)
  useEffect(() => {
    setForm((prev) => {
      if (prev.body_samples.length === bodyVarCount) return prev;
      const next = prev.body_samples.slice(0, bodyVarCount);
      while (next.length < bodyVarCount) next.push('');
      return { ...prev, body_samples: next };
    });
  }, [bodyVarCount]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // Every admin shares one WhatsApp account, so list the whole account's
  // templates (RLS scopes rows to the caller's account — same as the
  // broadcast template picker).
  async function fetchTemplates() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
      const creatorIds = [...new Set((data || []).map((row) => row.user_id).filter(Boolean))];
      if (creatorIds.length) {
        const { data: people } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', creatorIds);
        setCreators(
          Object.fromEntries((people || []).map((p) => [p.user_id, p.full_name || p.email || 'Unknown']))
        );
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      toast.error(t('toastLoadFailed'));
    } finally {
      setLoading(false);
    }
  }

  function buildSubmitPayload() {
    const sample_values: TemplateSampleValues = {};
    if (form.body_samples.some((v) => v.trim())) {
      sample_values.body = form.body_samples.map((v) => v.trim());
    }
    if (form.header_format === 'text' && form.header_sample.trim()) {
      sample_values.header = [form.header_sample.trim()];
    }

    return {
      name: form.name.trim(),
      category: form.category,
      language: form.language.trim() || 'en_US',
      header_type: form.header_format === 'none' ? undefined : form.header_format,
      header_content:
        form.header_format === 'text' ? form.header_content.trim() : undefined,
      header_media_url:
        form.header_format !== 'none' && form.header_format !== 'text'
          ? form.header_media_url.trim() || undefined
          : undefined,
      body_text: form.body_text.trim(),
      footer_text: form.footer_text.trim() || undefined,
      buttons: form.buttons.length > 0 ? form.buttons : undefined,
      sample_values:
        Object.keys(sample_values).length > 0 ? sample_values : undefined,
    };
  }

  function openEdit(template: MessageTemplate) {
    setEditingId(template.id);
    setAttempted(false);
    const next: TemplateFormData = {
      name: template.name,
      category: template.category,
      language: template.language || 'en_US',
      header_format: (template.header_type ?? 'none') as HeaderFormat,
      header_content: template.header_content ?? '',
      header_media_url: template.header_media_url ?? '',
      header_sample: template.sample_values?.header?.[0] ?? '',
      body_text: template.body_text,
      body_samples: template.sample_values?.body ?? [],
      footer_text: template.footer_text ?? '',
      buttons: template.buttons ?? [],
    };
    setForm(next);
    setInitialForm(next);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingId(null);
    setAttempted(false);
    setForm(emptyForm);
    setInitialForm(emptyForm);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setConfirmDiscard(false);
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const livePayload = buildSubmitPayload();
  const allIssues = collectIssues(livePayload, bodyVarCount, headerVarCount);
  // "X is required" only after a submit attempt — don't nag on an empty form.
  const issues = attempted ? allIssues : allIssues.filter((m) => !/required/i.test(m));

  async function handleSubmit() {
    // AUTHENTICATION is blocked by the persistent banner + disabled
    // submit button; this is a defensive second line of defense.
    if (form.category === 'Authentication') return;
    setAttempted(true);
    if (allIssues.length > 0) return;
    try {
      setSubmitting(true);
      const isEdit = editingId !== null;
      const url = isEdit
        ? `/api/whatsapp/whatsapp/templates/${editingId}`
        : '/api/whatsapp/whatsapp/templates/submit';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSubmitPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error || `${isEdit ? 'Edit' : 'Submit'} failed (HTTP ${res.status})`,
        );
      }
      // Refresh first, then close — re-opening the dialog
      // immediately should not show a stale list.
      if (user) await fetchTemplates();
      toast.success(
        data.dry_run
          ? isEdit
            ? t('toastSaveEditDry')
            : t('toastSaveNewDry')
          : isEdit
            ? t('toastSubmitEditSuccess')
            : t('toastSubmitNewSuccess'),
      );
      closeDialog();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err instanceof Error ? err.message : t('toastSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSyncFromMeta() {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/whatsapp/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Sync failed (HTTP ${res.status})`);
      }
      toast.success(
        t('toastSyncCount', { total: data.total }) +
          (data.inserted || data.updated
            ? t('toastSyncDetails', { inserted: data.inserted, updated: data.updated })
            : ''),
      );
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const preview = data.errors.slice(0, 3).map(
          (e: { name: string; language: string; message: string }) =>
            `${e.name} (${e.language})`,
        );
        const suffix =
          data.errors.length > 3 ? `, +${data.errors.length - 3} more` : '';
        toast.error(t('toastSyncFailed', { preview: preview.join(', ') + suffix }));
      }
      if (data.truncated) {
        // Use error (not warning) so the message survives long
        // enough to read — sonner's `warning` auto-dismisses on
        // the same short timer as `success`.
        toast.error(
          t('toastSyncTruncated'),
          { duration: 10000 },
        );
      }
      await fetchTemplates();
    } catch (err) {
      console.error('Template sync error:', err);
      toast.error(err instanceof Error ? err.message : t('toastSyncError'));
    } finally {
      setSyncing(false);
    }
  }

  async function confirmDelete() {
    const target = templateToDelete;
    if (!target || deletingId) return;
    setDeletingId(target.id);
    try {
      // Route handler scopes the Meta delete via hsm_id (so sibling
      // language variants survive) and falls through to remove the
      // local row. Local-only rows skip the Meta call.
      const res = await fetch(`/api/whatsapp/whatsapp/templates/${target.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Delete failed (HTTP ${res.status})`);
      }
      toast.success(t('toastDeleteSuccess'));
      setTemplates((prev) => prev.filter((t) => t.id !== target.id));
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err instanceof Error ? err.message : t('toastDeleteError'));
    } finally {
      setDeletingId(null);
    }
  }

  // The patch type unions every field across button variants. The
  // conditional rendering below ensures only fields valid for the
  // current button's `type` reach this function, so the runtime
  // assertion + per-type spread preserves discriminated-union
  // invariants without forcing every call site to thread the type
  // through generics (which TS can't infer from a partial literal).
  type ButtonPatch = {
    text?: string;
    url?: string;
    phone_number?: string;
    example?: string;
  };
  function updateButton(index: number, patch: ButtonPatch) {
    setForm((prev) => {
      const current = prev.buttons[index];
      if (!current) return prev;
      const next = [...prev.buttons];
      // Per-variant spread keeps the discriminant pinned. Switch
      // exhaustiveness is enforced by TypeScript.
      switch (current.type) {
        case 'QUICK_REPLY':
          next[index] = {
            ...current,
            ...(patch.text !== undefined && { text: patch.text }),
          };
          break;
        case 'URL':
          next[index] = {
            ...current,
            ...(patch.text !== undefined && { text: patch.text }),
            ...(patch.url !== undefined && { url: patch.url }),
            ...(patch.example !== undefined && { example: patch.example }),
          };
          break;
        case 'PHONE_NUMBER':
          next[index] = {
            ...current,
            ...(patch.text !== undefined && { text: patch.text }),
            ...(patch.phone_number !== undefined && {
              phone_number: patch.phone_number,
            }),
          };
          break;
        case 'COPY_CODE':
          next[index] = {
            ...current,
            ...(patch.text !== undefined && { text: patch.text }),
            ...(patch.example !== undefined && { example: patch.example }),
          };
          break;
      }
      return { ...prev, buttons: next };
    });
  }

  function changeButtonType(index: number, type: TemplateButton['type']) {
    setForm((prev) => {
      const next = [...prev.buttons];
      next[index] = emptyButton(type);
      return { ...prev, buttons: next };
    });
  }

  function removeButton(index: number) {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  }

  function addButton() {
    if (form.buttons.length >= TEMPLATE_LIMITS.maxButtonsTotal) return;
    setForm((prev) => ({
      ...prev,
      buttons: [...prev.buttons, emptyButton('QUICK_REPLY')],
    }));
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading templates">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/70" />
          ))}
        </div>
      </div>
    );
  }

  const tabOf = (tpl: MessageTemplate): StatusTab =>
    tpl.status === 'APPROVED' || tpl.status === 'PENDING' || tpl.status === 'REJECTED' ? tpl.status : 'other';
  const tabCounts = templates.reduce<Record<StatusTab, number>>(
    (acc, tpl) => {
      acc.all++;
      acc[tabOf(tpl)]++;
      return acc;
    },
    { all: 0, APPROVED: 0, PENDING: 0, REJECTED: 0, other: 0 },
  );
  const q = query.trim().toLowerCase();
  const visibleTemplates = templates.filter(
    (tpl) =>
      (statusTab === 'all' || tabOf(tpl) === statusTab) &&
      (!q || tpl.name.toLowerCase().includes(q.replace(/ /g, '_')) || tpl.body_text.toLowerCase().includes(q)),
  );
  const TAB_LABEL: Record<StatusTab, string> = {
    all: 'All',
    APPROVED: 'Approved',
    PENDING: 'Waiting for Meta',
    REJECTED: 'Rejected',
    other: 'Other',
  };

  const headerNeedsMedia =
    form.header_format !== 'none' && form.header_format !== 'text';

  async function handleHeaderImageFile(file: File) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error(t('toastInvalidImage'));
      return;
    }
    if (file.size > MEDIA_MAX_BYTES_BY_KIND.image) {
      toast.error(
        t('toastImageTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) }),
      );
      return;
    }
    setUploadingHeader(true);
    try {
      const { publicUrl } = await uploadAccountMedia('chat-media', file);
      setForm((f) => ({ ...f, header_media_url: publicUrl }));
      toast.success(t('toastUploadSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toastUploadFailed'));
    } finally {
      setUploadingHeader(false);
    }
  }

  return (
    <section className="animate-in fade-in-50 space-y-4 duration-200">
      <h1 className="sr-only">{t('title')}</h1>
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSyncFromMeta}
              disabled={syncing}
              title={t('syncTitle')}
            >
              <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('syncing') : t('syncFromMeta')}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t('newTemplate')}
            </Button>
          </div>
        }
      />

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-foreground">{t('noTemplates')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t('createFirst')}</p>
            <Button className="mt-3" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              {t('newTemplate')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
              {(['all', 'APPROVED', 'PENDING', 'REJECTED', 'other'] as StatusTab[])
                .filter((k) => k === 'all' || tabCounts[k] > 0)
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={statusTab === k}
                    onClick={() => setStatusTab(k)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${
                      statusTab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {TAB_LABEL[k]}
                    <span className="text-xs tabular-nums text-muted-foreground">{tabCounts[k]}</span>
                  </button>
                ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="h-9 pl-9"
              />
            </div>
          </div>

          {visibleTemplates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-foreground">No templates match these filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusTab('all');
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleTemplates.map((template) => {
            const statusKey = template.status || 'DRAFT';
            const status = templateStatusConfig[statusKey];
            const rejection = template.rejection_reason || template.submission_error;
            const help = rejectionHelp(template.rejection_reason);
            const quality = template.quality_score ? QUALITY_LABEL[template.quality_score] : null;
            return (
              <Card key={template.id}>
                <CardContent className="flex items-start justify-between pt-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{templateDisplayName(template.name)}</h3>
                      <Badge className={`border text-xs ${status.classes}`}>{status.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span title={TEMPLATE_CATEGORY_INFO[template.category]?.hint}>{template.category}</span>
                      {' · '}
                      {languageName(template.language)}
                      {template.user_id && creators[template.user_id] && <> · by {creators[template.user_id]}</>}
                    </p>
                    <p className="line-clamp-3 whitespace-pre-line text-sm text-foreground/80">{template.body_text}</p>
                    {quality && <p className={`text-xs font-medium ${quality.className}`}>{quality.text}</p>}
                    {rejection && (
                      <div role="note" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                        <p className="flex items-start gap-1.5 font-medium text-foreground">
                          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                          {help ?? 'Meta didn’t accept this template.'}
                        </p>
                        <details className="mt-1 pl-5 text-xs text-muted-foreground">
                          <summary className="cursor-pointer">Technical details</summary>
                          <p className="mt-1 break-words font-mono">{rejection}</p>
                        </details>
                      </div>
                    )}
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    {statusKey === 'APPROVED' && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(template)} title={t('editTitle')}>
                        <Pencil className="size-3.5" aria-hidden />
                        {t('edit')}
                      </Button>
                    )}
                    {(statusKey === 'REJECTED' || statusKey === 'PAUSED') && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(template)} title={t('resubmitTitle')}>
                        <RotateCcw className="size-3.5" aria-hidden />
                        {t('resubmit')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTemplateToDelete(template)}
                      disabled={deletingId === template.id}
                      aria-label={`Delete ${templateDisplayName(template.name)}`}
                      title={template.meta_template_id ? t('deleteMetaLocallyTitle') : t('deleteLocallyTitle')}
                      className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      {deletingId === template.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
          )}
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) return setDialogOpen(true);
          // Long form — never throw away edits on Esc / outside click.
          if (isDirty) setConfirmDiscard(true);
          else closeDialog();
        }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">
              {editingId ? t('dialogEditTitle') : t('dialogNewTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingId
                ? t('dialogEditDesc')
                : t('dialogNewDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-name" className="text-foreground">{t('templateName')}</Label>
              <Input
                id="template-name"
                placeholder="e.g. donation_receipt"
                value={form.name}
                onChange={(e) =>
                  // Meta only accepts lowercase letters, digits and underscores.
                  setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_') })
                }
                disabled={editingId !== null}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">
                {editingId
                  ? t('nameFixed')
                  : t('nameHint')}
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">{t('category')}</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                {CATEGORIES.map((cat) => {
                  const info = TEMPLATE_CATEGORY_INFO[cat];
                  const selected = form.category === cat;
                  const disabled = cat === 'Authentication';
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-disabled={disabled}
                      onClick={() => !disabled && setForm({ ...form, category: cat })}
                      className={`rounded-lg border p-3 text-left transition ${
                        disabled
                          ? 'cursor-not-allowed border-border opacity-60'
                          : selected
                            ? 'border-foreground ring-1 ring-foreground'
                            : 'border-border hover:border-foreground/40'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-foreground">{info.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{info.hint}</span>
                      {disabled && (
                        <a
                          href="https://business.facebook.com/wa/manage/message-templates/"
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2"
                        >
                          Open WhatsApp Manager <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">{t('language')}</Label>
                <Select
                  items={Object.fromEntries(LANGUAGE_OPTIONS.map((l) => [l.code, l.label]))}
                  value={form.language}
                  onValueChange={(val) => val && setForm({ ...form, language: val })}
                  disabled={editingId !== null}
                >
                  <SelectTrigger className="w-full bg-muted border-border text-foreground disabled:opacity-60 disabled:cursor-not-allowed">
                    <SelectValue placeholder="en_US" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem
                        key={lang.code}
                        value={lang.code}
                        className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                      >
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {editingId ? (
                    t('langFixed')
                  ) : (
                    <span>{t.rich('langHint', { code: (chunks) => <code>{chunks}</code> })}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t('header')}</Label>
              <Select
                items={{
                  none: t('headerNone'),
                  text: t('headerText'),
                  image: t('headerImage'),
                  video: t('headerVideo'),
                  document: t('headerDocument'),
                }}
                value={form.header_format}
                onValueChange={(val) =>
                  // Preserve header_content, header_media_url, and
                  // header_sample across format switches. The submit
                  // payload builder only reads the field that matches
                  // the active format, so an orphan value on a hidden
                  // field is harmless — and keeping it lets the user
                  // switch formats to compare without losing typing.
                  setForm({
                    ...form,
                    header_format: (val || 'none') as HeaderFormat,
                  })
                }
              >
                <SelectTrigger className="w-full bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {HEADER_FORMATS.map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                    >
                      {type === 'none'
                        ? t('headerNone')
                        : type === 'text'
                          ? t('headerText')
                          : type === 'image'
                            ? t('headerImage')
                            : type === 'video'
                              ? t('headerVideo')
                              : t('headerDocument')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {form.header_format === 'text' && (
                <div className="space-y-2 mt-2">
                  <div className="flex justify-end">
                    <CharCount value={form.header_content} max={TEMPLATE_LIMITS.headerTextMaxLength} />
                  </div>
                  <Input
                    id="template-header-text"
                    aria-label="Header text"
                    placeholder={t('headerTextPlaceholder')}
                    value={form.header_content}
                    onChange={(e) =>
                      setForm({ ...form, header_content: e.target.value })
                    }
                    maxLength={TEMPLATE_LIMITS.headerTextMaxLength}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                  {headerVarCount > 0 && (
                    <Input
                      id="template-header-sample"
                      aria-label={t('headerSampleAria')}
                      placeholder={t('headerSamplePlaceholder')}
                      value={form.header_sample}
                      onChange={(e) =>
                        setForm({ ...form, header_sample: e.target.value })
                      }
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                  )}
                </div>
              )}

              {headerNeedsMedia && (
                <div className="space-y-2 mt-2">
                  {form.header_format === 'image' && (
                    <div className="flex items-center gap-2">
                      <input
                        ref={headerFileRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleHeaderImageFile(f);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingHeader}
                        onClick={() => headerFileRef.current?.click()}
                      >
                        {uploadingHeader ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {t('uploadImage')}
                      </Button>
                      <span className="text-[11px] text-muted-foreground">
                        {t('uploadHint')}
                      </span>
                    </div>
                  )}
                  <Input
                    placeholder={t('mediaUrlPlaceholder', { format: form.header_format })}
                    value={form.header_media_url}
                    onChange={(e) =>
                      setForm({ ...form, header_media_url: e.target.value })
                    }
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                  {form.header_format === 'image' && form.header_media_url && (
                    <PreviewImage
                      src={form.header_media_url}
                      alt="Header sample"
                      className="max-h-28 rounded-md border border-border object-contain"
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {form.header_format === 'image'
                      ? t('imageHint')
                      : t('mediaHint')}
                    {form.header_format === 'video' &&
                      t('videoHint')}
                    {form.header_format === 'document' &&
                      t('documentHint')}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="template-body" className="text-foreground">{t('bodyText')}</Label>
                <CharCount value={form.body_text} max={TEMPLATE_LIMITS.bodyMaxLength} />
              </div>
              <Textarea
                id="template-body"
                placeholder={t('bodyPlaceholder')}
                value={form.body_text}
                onChange={(e) =>
                  setForm({ ...form, body_text: e.target.value })
                }
                rows={6}
                maxLength={TEMPLATE_LIMITS.bodyMaxLength}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                {t('bodyHint')}
              </p>

              {bodyVarCount > 0 && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {t('sampleValues')}
                  </Label>
                  {form.body_samples.map((val, i) => {
                    const inputId = `template-body-sample-${i}`;
                    return (
                      <Input
                        key={i}
                        id={inputId}
                        aria-label={t('sampleAria', { var: `{{${i + 1}}}` })}
                        placeholder={t('samplePlaceholder', { var: `{{${i + 1}}}` })}
                        value={val}
                        onChange={(e) => {
                          const next = [...form.body_samples];
                          next[i] = e.target.value;
                          setForm({ ...form, body_samples: next });
                        }}
                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="template-footer" className="text-foreground">{t('footer')}</Label>
                <CharCount value={form.footer_text} max={TEMPLATE_LIMITS.footerMaxLength} />
              </div>
              <Input
                id="template-footer"
                placeholder={t('footerPlaceholder')}
                value={form.footer_text}
                onChange={(e) =>
                  setForm({ ...form, footer_text: e.target.value })
                }
                maxLength={TEMPLATE_LIMITS.footerMaxLength}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">{t('buttons')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addButton}
                  disabled={form.buttons.length >= TEMPLATE_LIMITS.maxButtonsTotal}
                  className="border-border bg-transparent text-muted-foreground hover:bg-muted h-7 text-xs"
                >
                  <Plus className="size-3" />
                  {t('addButton')}
                </Button>
              </div>
              {form.buttons.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  {t('buttonsLimit', { max: TEMPLATE_LIMITS.maxButtonsTotal })}
                </p>
              ) : (
                <div className="space-y-2">
                  {form.buttons.map((btn, i) => (
                    <div
                      key={i}
                      className="space-y-2 rounded border border-border bg-muted/50 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Select
                          items={{
                            QUICK_REPLY: t('btnQuickReply'),
                            URL: t('btnUrl'),
                            PHONE_NUMBER: t('btnPhone'),
                            COPY_CODE: t('btnCopyCode'),
                          }}
                          value={btn.type}
                          onValueChange={(val) => {
                            // Same null guard as the Header Select
                            // (per PR 148): @base-ui Select fires
                            // onValueChange(null) on deselect.
                            if (!val) return;
                            changeButtonType(i, val as TemplateButton['type']);
                          }}
                        >
                          <SelectTrigger className="w-40 bg-muted border-border text-foreground h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem
                              value="QUICK_REPLY"
                              className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                            >
                              {t('btnQuickReply')}
                            </SelectItem>
                            <SelectItem
                              value="URL"
                              className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                            >
                              {t('btnUrl')}
                            </SelectItem>
                            <SelectItem
                              value="PHONE_NUMBER"
                              className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                            >
                              {t('btnPhone')}
                            </SelectItem>
                            <SelectItem
                              value="COPY_CODE"
                              className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                            >
                              {t('btnCopyCode')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={t('btnLabelPlaceholder')}
                          value={btn.text}
                          maxLength={TEMPLATE_LIMITS.buttonTextMaxLength}
                          onChange={(e) =>
                            updateButton(i, { text: e.target.value })
                          }
                          className="flex-1 bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeButton(i)}
                          aria-label={`Remove button ${i + 1}`}
                          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                      {btn.type === 'URL' && (
                        <div className="space-y-1 pl-1">
                          <Input
                            placeholder={t('urlPlaceholder')}
                            value={btn.url}
                            onChange={(e) =>
                              updateButton(i, { url: e.target.value })
                            }
                            className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                          />
                          {extractVariableIndices(btn.url).length > 0 && (
                            <Input
                              placeholder={t('urlSamplePlaceholder')}
                              value={btn.example ?? ''}
                              onChange={(e) =>
                                updateButton(i, { example: e.target.value })
                              }
                              className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                            />
                          )}
                        </div>
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <Input
                          placeholder={t('phonePlaceholder')}
                          value={btn.phone_number}
                          onChange={(e) =>
                            updateButton(i, { phone_number: e.target.value })
                          }
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                        />
                      )}
                      {btn.type === 'COPY_CODE' && (
                        <Input
                          placeholder={t('codePlaceholder')}
                          value={btn.example}
                          onChange={(e) =>
                            updateButton(i, { example: e.target.value })
                          }
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-2 lg:sticky lg:top-0 lg:self-start">
            <p className="text-sm font-medium text-foreground">Preview</p>
            <TemplatePreview
              headerType={form.header_format === 'none' ? null : form.header_format}
              headerText={fillPlaceholders(form.header_content, { '1': form.header_sample })}
              headerMediaUrl={form.header_media_url}
              body={fillPlaceholders(
                form.body_text,
                Object.fromEntries(form.body_samples.map((v, i) => [String(i + 1), v])),
              )}
              footer={form.footer_text}
              buttons={form.buttons}
            />
            <p className="text-xs text-muted-foreground">Blanks show your sample values. Meta reviews these samples.</p>
          </aside>
          </div>

          {issues.length > 0 && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-foreground">Fix before submitting:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground/90">
                {issues.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => (isDirty ? setConfirmDiscard(true) : closeDialog())}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || form.category === 'Authentication' || (attempted && allIssues.length > 0)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {editingId ? t('saving') : t('submitting')}
                </>
              ) : editingId ? (
                t('saveResubmit')
              ) : (
                t('submitApproval')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={templateToDelete !== null}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
        title={`Delete ${templateToDelete ? templateDisplayName(templateToDelete.name) : 'template'}?`}
        description={
          templateToDelete?.meta_template_id
            ? t('deleteMetaDesc', { name: templateToDelete.name })
            : t('deleteLocalDesc', { name: templateToDelete?.name || '' })
        }
        consequences={
          templateToDelete?.meta_template_id
            ? ['Remove it from Meta too — it can’t be used for broadcasts or replies any more', 'Its name can’t be reused for about 30 days']
            : undefined
        }
        confirmLabel="Delete template"
        destructive
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        description="This template hasn’t been submitted. What you’ve written will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={closeDialog}
      />
    </section>
  );
}
