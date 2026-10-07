import { PageHeading } from '@/components/PageHeading';
import { SettingsTabs } from './SettingsTabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeading title="Settings" />
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
