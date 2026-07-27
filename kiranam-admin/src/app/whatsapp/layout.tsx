import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { verifyAdmin } from '@/lib/dal';
import { ThemeProvider } from '@/hooks/whatsapp/use-theme';
import { ThemedToaster } from '@/components/whatsapp/themed-toaster';
import { DashboardShell } from './dashboard-shell';

// Deliberately a sibling of (admin), not nested inside it — (admin)/layout.tsx
// renders kiranam-admin's own full sidebar (AdminShell) around every route
// beneath it, and wacrm's DashboardShell below is a second, complete sidebar
// shell of its own. Nesting would double them up. Reusing `verifyAdmin()`
// directly here (the same function (admin)/layout.tsx calls) gives this
// section the exact same admin-only protection without inheriting the UI.
export const metadata: Metadata = {
  title: {
    default: 'WhatsApp',
    template: '%s — WhatsApp — Kiranam Admin',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  await verifyAdmin();

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ThemeProvider>
        <DashboardShell>{children}</DashboardShell>
        <ThemedToaster />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
