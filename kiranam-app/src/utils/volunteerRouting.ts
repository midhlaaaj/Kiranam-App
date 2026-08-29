import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { supabase } from '@/lib/supabase';

const welcomeSeenKey = (uid: string) => `kiranam.volunteerWelcomeSeen.${uid}`;
const rejectionSeenKey = (uid: string) => `kiranam.rejectionAckedApplicationId.${uid}`;

export async function hasSeenVolunteerWelcome(uid: string): Promise<boolean> {
  const seen = await AsyncStorage.getItem(welcomeSeenKey(uid));
  return seen === '1';
}

export async function markVolunteerWelcomeSeen(uid: string): Promise<void> {
  await AsyncStorage.setItem(welcomeSeenKey(uid), '1');
}

// Stores the id of the most recently *acknowledged* rejected application —
// not a plain boolean — so a reapply-then-reject-again cycle surfaces the
// rejection screen again instead of staying silently suppressed forever.
export async function markRejectionAcknowledged(uid: string, applicationId: string): Promise<void> {
  await AsyncStorage.setItem(rejectionSeenKey(uid), applicationId);
}

async function getLatestApplication(uid: string) {
  const { data } = await supabase
    .from('volunteer_applications')
    .select('id, status')
    .eq('profile_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// Returns '/volunteer-rejected' if the latest application was rejected and
// hasn't been acknowledged yet for this uid, else null. Split out from
// resolvePostAuthRoute so pending.tsx's already-active-contributor fast
// path (which must never get blocked waiting on '/pending') can still
// catch a fresh rejection without going through the full resolver.
export async function checkFreshRejection(uid: string): Promise<Href | null> {
  const application = await getLatestApplication(uid);
  if (application?.status !== 'rejected') return null;
  const ackedId = await AsyncStorage.getItem(rejectionSeenKey(uid));
  if (ackedId === application.id) return null;
  return '/volunteer-rejected';
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

// Single source of truth for "where does a just-authenticated user land" —
// called from otp.tsx (post-verify) and index.tsx (session already
// active). Same duplication-avoidance rationale as resolveApprovedVolunteerRoute
// above: this exact profile-role/application-status branch used to be
// copy-pasted across both call sites.
export async function resolvePostAuthRoute(uid: string): Promise<Href> {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).single();
  const application = await getLatestApplication(uid);

  if (profile?.role === 'volunteer' && application?.status === 'approved') {
    return resolveApprovedVolunteerRoute(uid);
  }

  const rejectedRoute = await checkFreshRejection(uid);
  if (rejectedRoute) return rejectedRoute;

  if (profile?.role === 'volunteer' || application?.status === 'pending' || application?.status === 'approved') {
    return '/pending';
  }
  return '/(tabs)/home';
}
