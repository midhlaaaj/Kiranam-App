import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

// Interfaces for our app types
export interface Campaign {
  id: string;
  title: string;
  status: 'active' | 'completed';
  pct: number;
  raised: number;
  goal: number;
  raisedFmt: string;
  goalFmt: string;
  description: string;
  coverImageUrl: string | null;
  galleryUrls: string[];
}

export interface PaymentRecord {
  id: string;
  date: string;
  label: string;
  amount: number;
  ok: boolean;
  failed: boolean;
}

export interface NotificationRecord {
  id: string;
  isContribution: boolean;
  isCampaign: boolean;
  isSystem: boolean;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  cat: 'contribution' | 'campaign' | 'system';
  /** Relative in-app route to navigate to on tap (e.g. "/campaign-detail?id=…").
   * Null for purely informational notifications. */
  deepLink: string | null;
}

export interface EventRecord {
  id: string;
  title: string;
  dateStr: string;
  timeStr: string;
  location: string;
  isPast: boolean;
  desc: string;
  coverImageUrl: string | null;
  galleryUrls: string[];
}

export interface ContributorNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface VolunteerMember {
  id: string;
  name: string;
  phone: string;
  joinedLabel: string;
  status: 'active' | 'due' | 'overdue' | 'inactive';
  monthlyAmount: number;
}

interface AppContextType {
  // Auth / user state
  phone: string;
  setPhone: (phone: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  isEmailVerified: boolean;
  emailReceipt: (receipt: { txnId: string; amount: number; label: string; dateStr: string; pdfBase64: string }) => Promise<{ error: string | null }>;
  userAvatarUrl: string;
  referralCode: string;
  setReferralCode: (code: string) => void;
  isLoggedIn: boolean;
  isVolunteer: boolean;
  myReferralCode: string;
  updateReferralCode: (code: string) => Promise<{ error: string | null }>;

  // Auth actions (backed by Supabase)
  signInWithPhone: (phoneE164: string) => Promise<{ error: string | null }>;
  verifyOtpCode: (phoneE164: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
  saveProfile: (fields: {
    fullName: string;
    email: string;
    role: 'contributor' | 'volunteer';
    whatsappConsent?: boolean;
  }) => Promise<{ error: string | null }>;
  updateName: (fullName: string) => Promise<{ error: string | null }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
  updateProfilePhoto: (localUri: string) => Promise<{ error: string | null; url?: string }>;
  applyForVolunteer: (motivation: string) => Promise<{ error: string | null }>;

  // App settings & configuration
  profileLoading: boolean;
  hasCommitment: boolean;
  commitmentAmount: number;
  setCommitmentAmount: (amount: number) => Promise<{ error: string | null }>;
  isAutopayEnabled: boolean;
  setAutopayEnabled: (val: boolean) => Promise<{ error: string | null }>;
  nextDueDate: string;
  setNextDueDate: (date: string) => void;
  isPaidThisCycle: boolean;

  // Data lists (loaded from Supabase)
  campaigns: Campaign[];
  payments: PaymentRecord[];
  notifications: NotificationRecord[];
  events: EventRecord[];
  volunteerMembers: VolunteerMember[];
  totalContributed: number;
  campaignGiving: number;

  // App Actions
  makeRazorpayPayment: (amount: number, label: string, campaignId?: string) => Promise<PaymentRecord>;
  recordOfflineContribution: (
    contributorId: string,
    amount: number,
    campaignId: string | null,
    label: string,
    note?: string
  ) => Promise<{ error: string | null }>;
  fetchContributorNotes: (contributorId: string) => Promise<{ notes: ContributorNote[]; error: string | null }>;
  addContributorNote: (contributorId: string, body: string) => Promise<{ error: string | null }>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteAllNotifications: () => Promise<void>;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'raisedFmt' | 'goalFmt' | 'pct'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

const formatJoinedLabel = (isoDate: string) => {
  const d = new Date(isoDate);
  return `Joined ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
};

const formatDueDateLabel = (isoDate: string | null) => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const deriveMemberStatus = (commitment?: {
  monthly_amount: number;
  autopay_enabled: boolean;
  next_due_date: string | null;
} | null): VolunteerMember['status'] => {
  if (!commitment || !commitment.autopay_enabled) return 'inactive';
  if (!commitment.next_due_date) return 'active';
  const diffDays = (new Date(commitment.next_due_date).getTime() - Date.now()) / 86400000;
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due';
  return 'active';
};

// Supabase stores auth phone numbers without a leading "+" (e.g. "918086623316"),
// but the rest of the app treats `phone` as full E.164 with the "+" prefix.
const normalizePhone = (raw: string) => (raw && !raw.startsWith('+') ? `+${raw}` : raw);

const ensureReferralCode = async (uid: string, fullName: string): Promise<string> => {
  const { data: existing } = await supabase
    .from('referrals')
    .select('referral_code')
    .eq('volunteer_id', uid)
    .maybeSingle();
  if (existing?.referral_code) return existing.referral_code;

  const firstName = (fullName.split(' ')[0] || 'VOL').toUpperCase().replace(/[^A-Z]/g, '') || 'VOL';
  const year = new Date().getFullYear();
  const baseCode = `${firstName}${year}`;

  // referrals.referral_code has a UNIQUE constraint, so two volunteers with
  // the same first name colliding on the base code is expected — retry with
  // a random suffix until an insert succeeds (or we give up after a few
  // tries, which would mean extraordinarily bad luck on the random space).
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? baseCode : `${baseCode}${Math.floor(10 + Math.random() * 90)}`;
    const { data: inserted, error } = await supabase
      .from('referrals')
      .insert({ volunteer_id: uid, referral_code: candidate })
      .select('referral_code')
      .single();
    if (!error && inserted) return inserted.referral_code;
    // Anything other than a unique-constraint violation isn't worth retrying.
    if (error && error.code !== '23505') break;
  }

  // Every attempt collided (or a non-collision error occurred) — fall back
  // to a fully random suffix that's astronomically unlikely to collide.
  const desperateCode = `${baseCode}${Math.floor(1000 + Math.random() * 9000)}`;
  const { data: last } = await supabase
    .from('referrals')
    .insert({ volunteer_id: uid, referral_code: desperateCode })
    .select('referral_code')
    .single();
  return last?.referral_code ?? desperateCode;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);

  const [phone, setPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userAvatarUrl, setUserAvatarUrl] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState('');

  const [profileLoading, setProfileLoading] = useState(true);
  const [hasCommitment, setHasCommitment] = useState(false);
  const [commitmentAmount, setCommitmentAmountState] = useState(500);
  const [isAutopayEnabled, setAutopayEnabledState] = useState(true);
  const [nextDueDate, setNextDueDateState] = useState('');
  // Raw ISO next_due_date, kept alongside the formatted display string so
  // payment code can compare it to "today" without re-parsing display text.
  const [nextDueDateIso, setNextDueDateIso] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [volunteerMembers, setVolunteerMembers] = useState<VolunteerMember[]>([]);

  const [totalContributed, setTotalContributed] = useState(0);
  const [campaignGiving, setCampaignGiving] = useState(0);

  // Keep the latest userName available inside async callbacks without re-subscribing.
  const userNameRef = useRef(userName);
  userNameRef.current = userName;
  const userEmailRef = useRef(userEmail);
  userEmailRef.current = userEmail;

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Confirming a new email (see updateEmail) happens by tapping a link outside
  // the app, so there's no in-app event for it. On resume, re-check with the
  // server: getUser() reflects a freshly-confirmed email_confirmed_at (unlike
  // the cached session), and sync_confirmed_email() writes the confirmed
  // address into profiles.email and claims any matching admin invite.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const reconcileEmail = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      // Only touch session state (which every consumer of `session` re-runs
      // off of) when something about the user actually changed — most
      // resumes are a no-op here, and creating a new session reference every
      // foreground was forcing the whole profile to re-fetch and flash its
      // loading skeletons for no reason.
      setSession((prev) => {
        if (!prev) return prev;
        if (prev.user.email === data.user.email && prev.user.email_confirmed_at === data.user.email_confirmed_at) {
          return prev;
        }
        return { ...prev, user: data.user };
      });
      if (data.user.email_confirmed_at) {
        const { data: result } = await supabase.rpc('sync_confirmed_email');
        if (!cancelled && result?.email && result.email !== userEmailRef.current) setUserEmail(result.email);
      }
    };

    reconcileEmail();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') reconcileEmail();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [session?.user?.id]);

  // Load public campaign/event data regardless of auth state
  const refreshCampaigns = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (!data) return;
    const ids = data.map((c) => c.id);
    const { data: images } = ids.length
      ? await supabase.from('campaign_images').select('campaign_id, image_url').in('campaign_id', ids).order('created_at', { ascending: true })
      : { data: [] };
    const galleryByCampaign = new Map<string, string[]>();
    (images || []).forEach((img) => {
      const list = galleryByCampaign.get(img.campaign_id) || [];
      list.push(img.image_url);
      galleryByCampaign.set(img.campaign_id, list);
    });

    const today = new Date().toISOString().slice(0, 10);
    setCampaigns(data.map((c) => {
      const pct = c.goal > 0 ? Math.min(100, Math.round((Number(c.raised) / Number(c.goal)) * 100)) : 0;
      // Derived defensively at read time so a campaign shows as completed the
      // moment its goal is filled or end date passes, even if the admin panel
      // hasn't re-synced its own stored status yet.
      const isCompleted = c.status === 'completed' || pct >= 100 || (c.end_date && c.end_date < today);
      return {
        id: c.id,
        title: c.title,
        status: isCompleted ? 'completed' : 'active',
        pct,
        raised: Number(c.raised),
        goal: Number(c.goal),
        raisedFmt: Number(c.raised).toLocaleString('en-IN'),
        goalFmt: Number(c.goal).toLocaleString('en-IN'),
        description: c.description || '',
        coverImageUrl: c.cover_image_url || null,
        galleryUrls: galleryByCampaign.get(c.id) || [],
      };
    }));
  }, []);

  const refreshEvents = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (!data) return;
    const ids = data.map((e) => e.id);
    const { data: images } = ids.length
      ? await supabase.from('event_images').select('event_id, image_url').in('event_id', ids).order('created_at', { ascending: true })
      : { data: [] };
    const galleryByEvent = new Map<string, string[]>();
    (images || []).forEach((img) => {
      const list = galleryByEvent.get(img.event_id) || [];
      list.push(img.image_url);
      galleryByEvent.set(img.event_id, list);
    });

    const today = new Date().toISOString().slice(0, 10);
    setEvents(data.map((e) => ({
      id: e.id,
      title: e.title,
      dateStr: e.event_date
        ? new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : '',
      timeStr: e.time_label || '',
      location: e.location || '',
      isPast: e.is_past || (e.event_date && e.event_date < today),
      desc: e.description || '',
      coverImageUrl: e.cover_image_url || null,
      galleryUrls: galleryByEvent.get(e.id) || [],
    })));
  }, []);

  useEffect(() => {
    refreshCampaigns();
    refreshEvents();

    // Any contribution (in-app payment, or a volunteer/admin recording one
    // offline) bumps campaigns.raised via a DB trigger. Subscribing to that
    // table's changes pushes the new progress to every viewer instantly,
    // instead of waiting on the poll/foreground refresh below.
    const campaignsChannel = supabase
      .channel('campaigns-progress')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
        refreshCampaigns();
      })
      .subscribe();

    // Fallback for edits the realtime channel might miss (e.g. a dropped
    // connection): refresh whenever the app returns to the foreground, and
    // poll at a light interval while it's active.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refreshCampaigns();
        refreshEvents();
      }
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshCampaigns();
        refreshEvents();
      }
    }, 60000);

    return () => {
      supabase.removeChannel(campaignsChannel);
      subscription.remove();
      clearInterval(interval);
    };
  }, [refreshCampaigns, refreshEvents]);

  // Load everything scoped to the signed-in user whenever the session changes
  useEffect(() => {
    if (!session) {
      setUserName('');
      setUserEmail('');
      setUserAvatarUrl('');
      setPhone('');
      setIsVolunteer(false);
      setMyReferralCode('');
      setPayments([]);
      setNotifications([]);
      setVolunteerMembers([]);
      setHasCommitment(false);
      setCommitmentAmountState(500);
      setAutopayEnabledState(true);
      setNextDueDateState('');
      setProfileLoading(false);
      return;
    }

    const uid = session.user.id;
    let cancelled = false;
    setProfileLoading(true);

    (async () => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (cancelled) return;
      if (profile) {
        setUserName(profile.full_name || '');
        setUserEmail(profile.email || '');
        setUserAvatarUrl(profile.avatar_url || '');
        setPhone(profile.phone ? normalizePhone(profile.phone) : '');
      }

      const { data: application } = await supabase
        .from('volunteer_applications')
        .select('status')
        .eq('profile_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const volunteerEligible = profile?.role === 'volunteer' || application?.status === 'pending' || application?.status === 'approved';
      setIsVolunteer(!!volunteerEligible);

      if (volunteerEligible) {
        const code = await ensureReferralCode(uid, profile?.full_name || userNameRef.current);
        if (!cancelled) setMyReferralCode(code);

        const { data: assignments } = await supabase
          .from('contributor_assignments')
          .select('contributor_id')
          .eq('volunteer_id', uid);
        const contributorIds = (assignments || []).map((a) => a.contributor_id);

        if (contributorIds.length > 0) {
          const [{ data: memberProfiles }, { data: memberCommitments }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, phone, created_at').in('id', contributorIds),
            supabase.from('commitments').select('contributor_id, monthly_amount, autopay_enabled, next_due_date').in('contributor_id', contributorIds),
          ]);
          if (!cancelled) {
            const commitmentByContributor = new Map((memberCommitments || []).map((c) => [c.contributor_id, c]));
            setVolunteerMembers((memberProfiles || []).map((p) => {
              const commitment = commitmentByContributor.get(p.id);
              return {
                id: p.id,
                name: p.full_name || 'Unnamed',
                phone: p.phone || '',
                joinedLabel: formatJoinedLabel(p.created_at),
                status: deriveMemberStatus(commitment),
                monthlyAmount: commitment ? Number(commitment.monthly_amount) : 500,
              };
            }));
          }
        } else if (!cancelled) {
          setVolunteerMembers([]);
        }
      } else {
        setMyReferralCode('');
        setVolunteerMembers([]);
      }

      const { data: contributions } = await supabase
        .from('contributions')
        .select('*')
        .eq('contributor_id', uid)
        .order('created_at', { ascending: false });
      if (!cancelled && contributions) {
        setPayments(contributions.map((c) => ({
          id: c.transaction_ref || c.id,
          date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          label: c.label,
          amount: Number(c.amount),
          ok: c.status === 'success',
          failed: c.status !== 'success',
        })));
      }

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', uid)
        .order('created_at', { ascending: false });
      if (!cancelled && notifs) {
        setNotifications(notifs.map((n) => ({
          id: n.id,
          isContribution: n.category === 'contribution',
          isCampaign: n.category === 'campaign',
          isSystem: n.category === 'system',
          title: n.title,
          desc: n.body || '',
          time: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          unread: !n.is_read,
          cat: n.category,
          deepLink: n.deep_link || null,
        })));
      }

      const { data: commitment } = await supabase
        .from('commitments')
        .select('*')
        .eq('contributor_id', uid)
        .maybeSingle();
      if (!cancelled) {
        if (commitment) {
          setHasCommitment(true);
          setCommitmentAmountState(Number(commitment.monthly_amount));
          setAutopayEnabledState(commitment.autopay_enabled);
          setNextDueDateState(formatDueDateLabel(commitment.next_due_date));
          setNextDueDateIso(commitment.next_due_date);
        } else {
          setHasCommitment(false);
          setCommitmentAmountState(500);
          setAutopayEnabledState(true);
          setNextDueDateState('');
          setNextDueDateIso(null);
        }
      }
      if (!cancelled) setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  // Only the signed-in *user* changing (login/logout/switch account) should
  // trigger a full reload — a session reference change for the same user
  // (token refresh, the email-reconciliation effect above, etc.) shouldn't
  // flash every card on the screen back to its loading skeleton.
  }, [session?.user?.id]);

  // Recalculate giving totals when payments list updates
  useEffect(() => {
    const successPayments = payments.filter((p) => p.ok);
    const total = successPayments.reduce((acc, p) => acc + p.amount, 0);
    const campaignTotal = successPayments
      .filter((p) => p.label !== 'Monthly Contribution')
      .reduce((acc, p) => acc + p.amount, 0);
    setTotalContributed(total);
    setCampaignGiving(campaignTotal);
  }, [payments]);

  const signInWithPhone = async (phoneE164: string) => {
    // Delivery is WhatsApp, not SMS — Supabase Auth is configured with a
    // custom Send SMS Hook (wacrm's /api/auth-hooks/send-sms) that sends
    // the code through Kiranam's existing WhatsApp Business number instead
    // of a paid SMS provider. No `channel` option needed here — the hook
    // receives every phone-OTP send regardless (that was only relevant for
    // Twilio's built-in WhatsApp channel, which this doesn't use).
    // verifyOtpCode's `type: 'sms'` is unaffected either way — Supabase
    // verifies a phone OTP the same way no matter which channel sent it.
    const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
    return { error: error?.message ?? null };
  };

  const verifyOtpCode = async (phoneE164: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone: phoneE164, token, type: 'sms' });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Permanently deletes the caller's own account (Apple App Store
  // Guideline 5.1.1(v)). Calls the delete_own_account() Postgres RPC
  // (SECURITY DEFINER — the mobile app has no service-role access of
  // its own), which cascades through profiles and every table FK'd to
  // it. Signs out locally afterward since the session is no longer valid.
  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) return { error: error.message };
    await supabase.auth.signOut();
    return { error: null };
  };

  const saveProfile = async (fields: {
    fullName: string;
    email: string;
    role: 'contributor' | 'volunteer';
    whatsappConsent?: boolean;
  }) => {
    if (!session) return { error: 'Not signed in' };
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      user_id: session.user.id,
      full_name: fields.fullName,
      email: fields.email || null,
      role: fields.role,
      whatsapp_consent: fields.whatsappConsent ?? false,
      terms_accepted_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
    setUserName(fields.fullName);
    setUserEmail(fields.email);
    return { error: null };
  };

  const updateName = async (fullName: string) => {
    if (!session) return { error: 'Not signed in' };
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', session.user.id);
    if (error) return { error: error.message };
    setUserName(fullName);
    return { error: null };
  };

  // Lets a volunteer pick their own referral code instead of the
  // auto-generated FIRSTNAME+YEAR one. referrals.referral_code has a UNIQUE
  // constraint, so a collision surfaces as a Postgres 23505 error — that's
  // translated into a friendly "already in use" message rather than a raw
  // constraint-violation string.
  const updateReferralCode = async (code: string) => {
    if (!session) return { error: 'Not signed in' };
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length < 4) return { error: 'Referral code must be at least 4 characters.' };
    if (normalized.length > 20) return { error: 'Referral code must be 20 characters or fewer.' };

    const { error } = await supabase
      .from('referrals')
      .update({ referral_code: normalized })
      .eq('volunteer_id', session.user.id);
    if (error) {
      if (error.code === '23505') return { error: 'That referral code is already in use — try a different one.' };
      return { error: error.message };
    }
    setMyReferralCode(normalized);
    return { error: null };
  };

  // Changing email requires confirming the new address via a link Supabase emails
  // to it, so this only kicks off that flow — profiles.email is updated separately,
  // once the change is confirmed (see the reconciliation effect below).
  const updateEmail = async (email: string) => {
    if (!session) return { error: 'Not signed in' };
    const trimmed = email.trim();
    if (!trimmed) return { error: 'Email required' };
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) return { error: error.message };
    // Show the typed address right away (as unverified — see isEmailVerified
    // below) instead of leaving the old one displayed until the confirmation
    // link is clicked, which could be minutes or days later.
    setUserEmail(trimmed);
    return { error: null };
  };

  const emailReceipt = async (receipt: { txnId: string; amount: number; label: string; dateStr: string; pdfBase64: string }) => {
    if (!session) return { error: 'Not signed in' };
    const { error } = await supabase.functions.invoke('send-receipt-email', { body: receipt });
    if (error) return { error: error.message };
    return { error: null };
  };

  const updateProfilePhoto = async (localUri: string) => {
    if (!session) return { error: 'Not signed in' };
    try {
      const fileBytes = await new FileSystem.File(localUri).arrayBuffer();
      const path = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, fileBytes, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) return { error: uploadError.message };

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);
      if (updateError) return { error: updateError.message };

      setUserAvatarUrl(url);
      return { error: null, url };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to update photo' };
    }
  };

  const applyForVolunteer = async (motivation: string) => {
    if (!session) return { error: 'Not signed in' };
    const uid = session.user.id;
    try {
      const { error: insertError } = await supabase.from('volunteer_applications').insert({
        profile_id: uid,
        motivation,
        status: 'pending',
      });
      if (insertError) throw insertError;

      setIsVolunteer(true);
      const code = await ensureReferralCode(uid, userNameRef.current);
      setMyReferralCode(code);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Something went wrong submitting your application.' };
    }
  };

  // Only updates local state after a confirmed successful write — a donation
  // app must never show "Saved" (or leave a toggle visually flipped) when the
  // change didn't actually persist.
  const setCommitmentAmount = async (amount: number): Promise<{ error: string | null }> => {
    if (!session) return { error: 'Not signed in' };
    // `contributor_id` (not `id`) is the unique column commitments already
    // has one row per — without onConflict, upsert() matches on the
    // primary key instead, tries to INSERT a fresh row every time, and
    // silently fails the contributor_id uniqueness check.
    const { error } = await supabase
      .from('commitments')
      .upsert(
        { contributor_id: session.user.id, monthly_amount: amount },
        { onConflict: 'contributor_id' }
      );
    if (error) {
      console.error('Failed to save monthly commitment:', error.message);
      return { error: error.message };
    }
    setCommitmentAmountState(amount);
    setHasCommitment(true);
    return { error: null };
  };

  const setAutopayEnabled = async (val: boolean): Promise<{ error: string | null }> => {
    if (!session) return { error: 'Not signed in' };
    const { error } = await supabase
      .from('commitments')
      .upsert(
        { contributor_id: session.user.id, autopay_enabled: val },
        { onConflict: 'contributor_id' }
      );
    if (error) {
      console.error('Failed to save autopay setting:', error.message);
      return { error: error.message };
    }
    setAutopayEnabledState(val);
    return { error: null };
  };

  const setNextDueDate = (date: string) => {
    setNextDueDateState(date);
  };

  // Shared bookkeeping for a contribution row that has already been persisted as
  // 'success' by a real, server-verified Razorpay payment.
  const applySuccessfulPayment = async (
    inserted: { id: string; transaction_ref?: string | null; created_at: string },
    amount: number,
    label: string,
    campaignId?: string
  ): Promise<PaymentRecord> => {
    if (!session) throw new Error('Not signed in');
    const uid = session.user.id;

    const dateStr = new Date(inserted.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newRecord: PaymentRecord = {
      id: inserted.transaction_ref || inserted.id,
      date: dateStr,
      label,
      amount,
      ok: true,
      failed: false,
    };
    setPayments((prev) => [newRecord, ...prev]);

    if (campaignId) {
      setCampaigns((prev) => prev.map((c) => {
        if (c.id !== campaignId) return c;
        const newRaised = c.raised + amount;
        const newPct = c.goal > 0 ? Math.min(100, Math.round((newRaised / c.goal) * 100)) : 0;
        return { ...c, raised: newRaised, pct: newPct, raisedFmt: newRaised.toLocaleString('en-IN') };
      }));
    }

    if (label === 'Monthly Contribution') {
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      const nextIso = next.toISOString().slice(0, 10);
      const { error: commitmentError } = await supabase.from('commitments').upsert(
        {
          contributor_id: uid,
          monthly_amount: amount,
          autopay_enabled: isAutopayEnabled,
          next_due_date: nextIso,
        },
        { onConflict: 'contributor_id' }
      );
      if (commitmentError) console.error('Failed to update commitment after payment:', commitmentError.message);
      setHasCommitment(true);
      setCommitmentAmountState(amount);
      setNextDueDateState(formatDueDateLabel(nextIso));
      setNextDueDateIso(nextIso);
    }

    const receiptLink = `/receipt?id=${encodeURIComponent(newRecord.id)}&amount=${amount}&date=${encodeURIComponent(newRecord.date)}&label=${encodeURIComponent(label)}`;
    const { data: notifRow } = await supabase.from('notifications').insert({
      profile_id: uid,
      title: 'Payment Successful',
      body: `Your ₹${amount.toLocaleString('en-IN')} payment for "${label}" was successful.`,
      category: label === 'Monthly Contribution' ? 'contribution' : 'campaign',
      is_read: false,
      deep_link: receiptLink,
    }).select('*').single();
    if (notifRow) {
      setNotifications((prev) => [{
        id: notifRow.id,
        isContribution: notifRow.category === 'contribution',
        isCampaign: notifRow.category === 'campaign',
        isSystem: false,
        title: notifRow.title,
        desc: notifRow.body || '',
        time: 'Just now',
        unread: true,
        cat: notifRow.category,
        deepLink: notifRow.deep_link || null,
      }, ...prev]);
    }

    return newRecord;
  };

  // Guards against paying the same monthly commitment twice in one cycle — e.g. a
  // double-tap on Quick Pay, or the button still showing while a prior payment's
  // response is in flight. next_due_date is pushed a month out the moment a
  // Monthly Contribution payment succeeds, so "still in the future" reliably
  // means this cycle is already paid for.
  const assertNotAlreadyPaidThisCycle = (label: string) => {
    if (label !== 'Monthly Contribution') return;
    if (nextDueDateIso && new Date(nextDueDateIso).getTime() > Date.now()) {
      throw new Error(`You've already paid for this cycle. Next due ${formatDueDateLabel(nextDueDateIso)}.`);
    }
  };

  // Action: real Razorpay payment — creates an order server-side, launches native
  // checkout, then verifies the signature server-side before recording the payment.
  const makeRazorpayPayment = async (amount: number, label: string, campaignId?: string): Promise<PaymentRecord> => {
    if (!session) throw new Error('Not signed in');
    assertNotAlreadyPaidThisCycle(label);

    const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
      body: { amount, label, campaignId },
    });
    if (orderError || !orderData) throw orderError || new Error('Could not create payment order');

    // TEMP: react-native-razorpay is a native module and isn't available in Expo Go.
    // Re-enable this require once we rebuild a dev client with Razorpay linked back in.
    let RazorpayCheckout: any;
    try {
      RazorpayCheckout = require('react-native-razorpay').default;
    } catch {
      throw new Error('Razorpay payments are disabled in this Expo Go test build.');
    }
    const checkoutResult = await RazorpayCheckout.open({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'Kiranam',
      description: label,
      prefill: {
        name: userName || undefined,
        email: userEmail || undefined,
        contact: phone || undefined,
      },
      theme: { color: '#EC2028' },
    });

    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: {
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      },
    });
    if (verifyError || !verifyData?.record) throw verifyError || new Error('Payment verification failed');

    return applySuccessfulPayment(verifyData.record, amount, label, campaignId);
  };

  // Action: a volunteer records a monthly/campaign payment collected offline
  // (cash, UPI outside the app, etc.) for a contributor assigned to them.
  // Mirrors the admin's manual offline payment flow — inserted as is_offline
  // so it's distinguishable from real gateway payments, with collected_by
  // set to the volunteer for accountability (RLS enforces both).
  const recordOfflineContribution = async (
    contributorId: string,
    amount: number,
    campaignId: string | null,
    label: string,
    note?: string
  ): Promise<{ error: string | null }> => {
    if (!session) return { error: 'Not signed in' };
    if (!(amount > 0)) return { error: 'Amount must be greater than zero.' };

    const { error } = await supabase.from('contributions').insert({
      contributor_id: contributorId,
      campaign_id: campaignId,
      amount,
      label,
      status: 'success',
      is_offline: true,
      collected_by: session.user.id,
      note: note?.trim() || null,
    });
    if (error) return { error: error.message };

    if (campaignId) {
      setCampaigns((prev) => prev.map((c) => {
        if (c.id !== campaignId) return c;
        const newRaised = c.raised + amount;
        const newPct = c.goal > 0 ? Math.min(100, Math.round((newRaised / c.goal) * 100)) : 0;
        return { ...c, raised: newRaised, pct: newPct, raisedFmt: newRaised.toLocaleString('en-IN') };
      }));
    }

    return { error: null };
  };

  const fetchContributorNotes = async (contributorId: string): Promise<{ notes: ContributorNote[]; error: string | null }> => {
    const { data, error } = await supabase
      .from('contributor_notes')
      .select('id, body, created_at')
      .eq('contributor_id', contributorId)
      .order('created_at', { ascending: false });
    if (error) return { notes: [], error: error.message };
    return {
      notes: (data || []).map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      })),
      error: null,
    };
  };

  const addContributorNote = async (contributorId: string, body: string): Promise<{ error: string | null }> => {
    if (!session) return { error: 'Not signed in' };
    const trimmed = body.trim();
    if (!trimmed) return { error: 'Note cannot be empty.' };
    const { error } = await supabase.from('contributor_notes').insert({
      contributor_id: contributorId,
      volunteer_id: session.user.id,
      body: trimmed,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    supabase.from('notifications').update({ is_read: true }).eq('id', id).then(({ error }) => {
      if (error) console.error('Failed to mark notification as read:', error.message);
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (session) {
      supabase.from('notifications').update({ is_read: true }).eq('profile_id', session.user.id).then(({ error }) => {
        if (error) console.error('Failed to mark all notifications as read:', error.message);
      });
    }
  };

  const deleteAllNotifications = async () => {
    setNotifications([]);
    if (session) {
      const { error } = await supabase.from('notifications').delete().eq('profile_id', session.user.id);
      if (error) console.error('Failed to delete notifications:', error.message);
    }
  };

  const addCampaign = (camp: Omit<Campaign, 'id' | 'raisedFmt' | 'goalFmt' | 'pct'>) => {
    supabase.from('campaigns').insert({
      title: camp.title,
      goal: camp.goal,
      raised: camp.raised,
      status: camp.status,
    }).then(({ error }) => {
      if (error) console.error('Failed to add campaign:', error.message);
      else refreshCampaigns();
    });
  };

  const isPaidThisCycle = !!nextDueDateIso && new Date(nextDueDateIso).getTime() > Date.now();
  // Not just "does this session have a confirmed email" — it must be *this*
  // email that's confirmed. Otherwise, right after typing in a new unverified
  // address (still != session.user.email until the confirmation link is
  // clicked), it'd incorrectly show as verified because the *old* address
  // is still the confirmed one on the session.
  const isEmailVerified = !!(
    session?.user?.email_confirmed_at &&
    userEmail &&
    session.user.email?.toLowerCase() === userEmail.toLowerCase()
  );

  return (
    <AppContext.Provider value={{
      phone, setPhone,
      userName, setUserName,
      userEmail, setUserEmail,
      isEmailVerified,
      emailReceipt,
      userAvatarUrl,
      referralCode, setReferralCode,
      isLoggedIn: !!session,
      isVolunteer,
      myReferralCode,
      updateReferralCode,
      signInWithPhone,
      verifyOtpCode,
      signOut,
      deleteAccount,
      saveProfile,
      updateName,
      updateEmail,
      updateProfilePhoto,
      applyForVolunteer,
      profileLoading,
      hasCommitment,
      commitmentAmount, setCommitmentAmount,
      isAutopayEnabled, setAutopayEnabled,
      nextDueDate, setNextDueDate,
      isPaidThisCycle,
      campaigns,
      payments,
      notifications,
      events,
      volunteerMembers,
      totalContributed,
      campaignGiving,
      makeRazorpayPayment,
      recordOfflineContribution,
      fetchContributorNotes,
      addContributorNote,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteAllNotifications,
      addCampaign
    }}>
      {children}
    </AppContext.Provider>
  );
};
