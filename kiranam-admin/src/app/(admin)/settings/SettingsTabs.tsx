'use client';

import { usePathname } from 'next/navigation';
import { Tabs } from '@/components/Tabs';

const ITEMS = [
  { href: '/settings', label: 'General' },
  { href: '/settings/account', label: 'Account' },
  { href: '/settings/admin-users', label: 'Team' },
  { href: '/settings/logs', label: 'Activity log' },
];

/** Rendered once by settings/layout.tsx — active tab comes from the URL, so
 * the heading + tab strip never shift position between tabs. */
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <Tabs
      items={ITEMS.map((item) => ({
        ...item,
        active: item.href === '/settings' ? pathname === '/settings' : pathname.startsWith(item.href),
      }))}
    />
  );
}
