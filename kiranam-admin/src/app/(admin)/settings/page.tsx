import { KkNumberSettings } from './KkNumberSettings';
import { getAutoAssignKkNumber } from '@/lib/kkSettings';

// Org-wide settings. Admin invites + the admin list live under Team
// (/settings/admin-users); heading + tabs come from settings/layout.tsx.
export default async function SettingsPage() {
  const autoAssignKkNumber = await getAutoAssignKkNumber();
  return <KkNumberSettings autoAssignEnabled={autoAssignKkNumber} />;
}
