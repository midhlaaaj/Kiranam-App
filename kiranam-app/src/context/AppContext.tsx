import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
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
}

export interface EventRecord {
  id: string;
  title: string;
  dateStr: string;
  timeStr: string;
  location: string;
  isPast: boolean;
  desc: string;
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
  userAvatarUrl: string;
  referralCode: string;
  setReferralCode: (code: string) => void;
  isLoggedIn: boolean;
  isVolunteer: boolean;
  myReferralCode: string;

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
  updateProfilePhoto: (localUri: string) => Promise<{ error: string | null; url?: string }>;
  applyForVolunteer: (motivation: string) => Promise<{ error: string | null }>;

  // App settings & configuration
  profileLoading: boolean;
  hasCommitment: boolean;
  commitmentAmount: number;
  setCommitmentAmount: (amount: number) => Promise<void>;
  isAutopayEnabled: boolean;
  setAutopayEnabled: (val: boolean) => void;
  nextDueDate: string;
  setNextDueDate: (date: string) => void;

  // Data lists (loaded from Supabase)
  campaigns: Campaign[];
  payments: PaymentRecord[];
  notifications: NotificationRecord[];
  events: EventRecord[];
  volunteerMembers: VolunteerMember[];
  totalContributed: number;
  campaignGiving: number;

  // App Actions
  makePayment: (amount: number, label: string, campaignId?: string) => Promise<PaymentRecord>;
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
  const code = `${firstName}${year}`;

  const { data: inserted, error } = await supabase
    .from('referrals')
    .insert({ volunteer_id: uid, referral_code: code })
    .select('referral_code')
    .single();
  if (!error && inserted) return inserted.referral_code;

  // Referral code collided with an existing volunteer's code — retry once with a random suffix.
  const fallbackCode = `${code}${Math.floor(10 + Math.random() * 90)}`;
  const { data: retry } = await supabase
    .from('referrals')
    .insert({ volunteer_id: uid, referral_code: fallbackCode })
    .select('referral_code')
    .single();
  return retry?.referral_code ?? fallbackCode;
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

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load public campaign/event data regardless of auth state
  const refreshCampaigns = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (!data) return;
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
      };
    }));
  }, []);

  const refreshEvents = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (!data) return;
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
    })));
  }, []);

  useEffect(() => {
    refreshCampaigns();
    refreshEvents();

    // Admin-panel edits happen out-of-band (a different device/browser), so
    // there's nothing in-app that would otherwise trigger a refetch. Refresh
    // whenever the app returns to the foreground, and poll at a light
    // interval while it's active, so edits show up without a manual restart.
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
        } else {
          setHasCommitment(false);
          setCommitmentAmountState(500);
          setAutopayEnabledState(true);
          setNextDueDateState('');
        }
      }
      if (!cancelled) setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

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

  const updateProfilePhoto = async (localUri: string) => {
    if (!session) return { error: 'Not signed in' };
    try {
      const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
      const path = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
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

  const setCommitmentAmount = async (amount: number) => {
    setCommitmentAmountState(amount);
    if (session) {
      // `contributor_id` (not `id`) is the unique column commitments already
      // has one row per — without onConflict, upsert() matches on the
      // primary key instead, tries to INSERT a fresh row every time, and
      // silently fails the contributor_id uniqueness check (the error was
      // never checked here), so the change never actually persisted.
      const { error } = await supabase
        .from('commitments')
        .upsert(
          { contributor_id: session.user.id, monthly_amount: amount },
          { onConflict: 'contributor_id' }
        );
      if (error) console.error('Failed to save monthly commitment:', error.message);
      setHasCommitment(true);
    }
  };

  const setAutopayEnabled = (val: boolean) => {
    setAutopayEnabledState(val);
    if (session) {
      supabase
        .from('commitments')
        .upsert(
          { contributor_id: session.user.id, autopay_enabled: val },
          { onConflict: 'contributor_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Failed to save autopay setting:', error.message);
        });
    }
  };

  const setNextDueDate = (date: string) => {
    setNextDueDateState(date);
  };

  // Action: persist a contribution/payment
  const makePayment = async (amount: number, label: string, campaignId?: string): Promise<PaymentRecord> => {
    if (!session) throw new Error('Not signed in');
    const uid = session.user.id;
    const txnId = 'TXN' + Math.floor(1000000000 + Math.random() * 9000000000);

    const { data: inserted, error } = await supabase
      .from('contributions')
      .insert({
        contributor_id: uid,
        campaign_id: campaignId ?? null,
        amount,
        label,
        status: 'success',
        transaction_ref: txnId,
      })
      .select('*')
      .single();
    if (error || !inserted) throw error || new Error('Payment failed to save');

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
      await supabase.from('commitments').upsert({
        contributor_id: uid,
        monthly_amount: amount,
        autopay_enabled: isAutopayEnabled,
        next_due_date: nextIso,
      });
      setHasCommitment(true);
      setCommitmentAmountState(amount);
      setNextDueDateState(formatDueDateLabel(nextIso));
    }

    const { data: notifRow } = await supabase.from('notifications').insert({
      profile_id: uid,
      title: 'Payment Successful',
      body: `Your ₹${amount.toLocaleString('en-IN')} payment for "${label}" was successful.`,
      category: label === 'Monthly Contribution' ? 'contribution' : 'campaign',
      is_read: false,
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
      }, ...prev]);
    }

    return newRecord;
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    supabase.from('notifications').update({ is_read: true }).eq('id', id).then();
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (session) {
      supabase.from('notifications').update({ is_read: true }).eq('profile_id', session.user.id).then();
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
    }).then(() => refreshCampaigns());
  };

  return (
    <AppContext.Provider value={{
      phone, setPhone,
      userName, setUserName,
      userEmail, setUserEmail,
      userAvatarUrl,
      referralCode, setReferralCode,
      isLoggedIn: !!session,
      isVolunteer,
      myReferralCode,
      signInWithPhone,
      verifyOtpCode,
      signOut,
      deleteAccount,
      saveProfile,
      updateName,
      updateProfilePhoto,
      applyForVolunteer,
      profileLoading,
      hasCommitment,
      commitmentAmount, setCommitmentAmount,
      isAutopayEnabled, setAutopayEnabled,
      nextDueDate, setNextDueDate,
      campaigns,
      payments,
      notifications,
      events,
      volunteerMembers,
      totalContributed,
      campaignGiving,
      makePayment,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteAllNotifications,
      addCampaign
    }}>
      {children}
    </AppContext.Provider>
  );
};
