import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { supabase } from '@/lib/supabase';

const welcomeSeenKey = (uid: string) => `kiranam.volunteerWelcomeSeen.${uid}`;

export async function hasSeenVolunteerWelcome(uid: string): Promise<boolean> {
  const seen = await AsyncStorage.getItem(welcomeSeenKey(uid));
  return seen === '1';
}

export async function markVolunteerWelcomeSeen(uid: string): Promise<void> {
  await AsyncStorage.setItem(welcomeSeenKey(uid), '1');
}

// Single source of truth for "where does an approved volunteer go next" —
// called from otp.tsx (fresh login), index.tsx (session already active),
// pending.tsx (manual recheck), and volunteer-welcome.tsx (after the
// welcome page itself). Duplicating this decision across call sites is
// exactly the kind of drift that caused two earlier bugs this session
// (a stray router.push in otp.tsx and register.tsx where every other
// screen in the same flow had already moved to router.replace) — one
// function, everyone calls it. Return type is expo-router's own `Href`
// (not a loose custom shape) so it satisfies typed-routes' literal
// pathname union directly at every call site.
export async function resolveApprovedVolunteerRoute(uid: string): Promise<Href> {
  const seenWelcome = await hasSeenVolunteerWelcome(uid);
  if (!seenWelcome) {
    return '/volunteer-welcome';
  }

  // Same "does this volunteer already have a commitment" gate used at
  // signup for contributors — deferred to approval time for volunteers
  // since asking before an admin has actually approved them doesn't make
  // sense. Gated on real data (not a one-time flag) so it naturally stops
  // appearing the moment they've actually set one.
  const { data: commitment } = await supabase
    .from('commitments')
    .select('id')
    .eq('contributor_id', uid)
    .maybeSingle();

  if (!commitment) {
    return { pathname: '/choose-amount', params: { onboarding: '1', role: 'volunteer' } };
  }
  return '/(volunteer-tabs)/dashboard';
}
