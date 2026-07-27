import { Tabs } from '@/components/Tabs';

export function SettingsTabs({ active }: { active: 'general' | 'admin-users' | 'logs' }) {
  return (
    <Tabs
      items={[
        { href: '/settings', label: 'General', active: active === 'general' },
        { href: '/settings/admin-users', label: 'Admin Users', active: active === 'admin-users' },
        { href: '/settings/logs', label: 'Logs', active: active === 'logs' },
      ]}
    />
  );
}
