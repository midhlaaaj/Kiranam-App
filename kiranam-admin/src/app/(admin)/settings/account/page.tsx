import { verifyAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AccountForms } from './AccountForms';

// Heading + tabs come from settings/layout.tsx.
export default async function AccountSettingsPage() {
  const admin = await verifyAdmin();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', admin.id)
    .single();

  return (
    <div className="max-w-2xl">
      <AccountForms
        fullName={admin.full_name ?? ''}
        email={admin.email ?? ''}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  );
}
