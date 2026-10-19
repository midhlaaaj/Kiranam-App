'use client';

import { Skeleton, SkeletonPanel, SkeletonRegion } from '@/components/whatsapp/ui/skeleton';
import { Suspense, useMemo, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useTheme } from '@/hooks/whatsapp/use-theme';
import { SettingsRail } from '@/components/whatsapp/settings/settings-rail';
import { SettingsOverview } from '@/components/whatsapp/settings/settings-overview';
import { AppearancePanel } from '@/components/whatsapp/settings/appearance-panel';
import { WhatsAppConfig } from '@/components/whatsapp/settings/whatsapp-config';
import { QuickRepliesManager } from '@/components/whatsapp/settings/quick-replies-manager';
import { FieldsAndTagsPanel } from '@/components/whatsapp/settings/fields-and-tags-panel';
import { MembersTab } from '@/components/whatsapp/settings/members-tab';
import {
  resolveSection,
  type SettingsSection,
} from '@/components/whatsapp/settings/settings-sections';

// `useSearchParams` opts this page out of static prerendering unless it
// sits under a Suspense boundary. Without one, the production build hits
// the "missing Suspense with CSR bailout" error and the whole page bails
// to client-side rendering — shipping a settings screen whose rail never
// wires up its click handlers. You land on the section the URL carried
// (the account-menu Settings link points at `?tab=whatsapp`) and can't
// navigate away. Mirror the login/signup split: a thin wrapper supplies
// the boundary; the inner component reads the query string.
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageInner />
    </Suspense>
  );
}

/** Shown while the query string resolves: same title, rail and panel layout as the real page. */
function SettingsPageSkeleton() {
  return (
    <SkeletonRegion label="Loading settings">
      <Skeleton className="h-8 w-40 max-w-full" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start">
        {/* Mirrors the real rail: a scrolling row of pills below lg, a column from lg. */}
        <div className="flex gap-1 overflow-hidden lg:flex-col lg:gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-lg lg:w-full" />
          ))}
        </div>
        <SkeletonPanel fields={4} />
      </div>
    </SkeletonRegion>
  );
}

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode } = useTheme();
  const t = useTranslations('Settings');

  // The URL (`?tab=`) is the single source of truth for the active
  // section — deep-linkable, and it keeps the existing links in the
  // app sidebar/header working. Legacy tab values (tags, custom-fields)
  // resolve onto their new home; unknown/empty → the Overview landing.
  const section = resolveSection(searchParams.get('tab'));

  const go = (next: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/whatsapp/settings?${params.toString()}`, { scroll: false });
  };

  // Cheap, fetch-free rail hints. The Overview landing carries the
  // full live status/counts; the rail just surfaces the one that's
  // already in context.
  const hints: Partial<Record<SettingsSection, ReactNode>> = useMemo(
    () => ({
      appearance: mode.charAt(0).toUpperCase() + mode.slice(1),
    }),
    [mode],
  );

  const panel: Record<SettingsSection, ReactNode> = {
    overview: <SettingsOverview onSelect={go} />,
    appearance: <AppearancePanel />,
    whatsapp: <WhatsAppConfig />,
    'quick-replies': <QuickRepliesManager />,
    fields: <FieldsAndTagsPanel />,
    members: <MembersTab />,
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('pageTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('pageDesc')}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:items-start">
        <SettingsRail active={section} onSelect={go} hints={hints} />
        <div className="min-w-0">{panel[section]}</div>
      </div>
    </div>
  );
}
