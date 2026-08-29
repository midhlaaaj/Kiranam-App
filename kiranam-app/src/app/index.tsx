import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { extractReferralCodeFromText, stashPendingReferralCode } from '@/utils/referral';
import { resolveApprovedVolunteerRoute } from '@/utils/volunteerRouting';

const CLIPBOARD_CHECKED_KEY = 'kiranam.referralClipboardChecked';

// iOS has no install-referrer equivalent — a referral link tapped before
// the app was installed can't reach the app any other way once the App
// Store round-trip is done, so kiranam.online/join copies the join URL to
// the clipboard as a fallback. This reads it back exactly once per install
// (never again after) so returning users don't get an "Allow Paste"
// banner every time they open the app.
async function checkClipboardForReferralCode() {
  const alreadyChecked = await AsyncStorage.getItem(CLIPBOARD_CHECKED_KEY);
  if (alreadyChecked) return;
  await AsyncStorage.setItem(CLIPBOARD_CHECKED_KEY, '1');
  try {
    const hasString = await Clipboard.hasStringAsync();
    if (!hasString) return;
    const text = await Clipboard.getStringAsync();
    const code = extractReferralCodeFromText(text);
    if (code) await stashPendingReferralCode(code);
  } catch {
    // No clipboard access — this is a best-effort fallback, not a blocker.
  }
}

export default function SplashScreen() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  // If a session is already saved on-device, skip the "Get Started" splash
  // entirely and land the user straight in — same destination logic as
  // otp.tsx's post-verify routing (full_name presence, then volunteer
  // approval status), since a returning user never goes through otp.tsx.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No account yet on this device is exactly the "fresh install"
        // case a deferred referral link needs to survive — an existing,
        // signed-in user already went through this at their own signup.
        await checkClipboardForReferralCode();
        if (!cancelled) setCheckingSession(false);
        return;
      }

      const uid = session.user.id;
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', uid).single();
      if (cancelled) return;

      if (!profile?.full_name) {
        router.replace({ pathname: '/register', params: { role: profile?.role === 'volunteer' ? 'volunteer' : 'contributor' } });
        return;
      }

      // profiles.role only ever becomes 'volunteer' once an admin approves
      // the application — a pending/rejected/no-application account still
      // has role 'contributor', so routing must check application status,
      // not just role, to land a pending applicant on /pending correctly.
      const { data: application } = await supabase
        .from('volunteer_applications')
        .select('status')
        .eq('profile_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;

      if (profile.role === 'volunteer' && application?.status === 'approved') {
        const dest = await resolveApprovedVolunteerRoute(uid);
        if (cancelled) return;
        router.replace(dest);
      } else if (profile.role === 'volunteer' || application?.status === 'pending' || application?.status === 'approved') {
        router.replace('/pending');
      } else {
        router.replace('/(tabs)/home');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately mount-once — re-running on every `router` identity change
    // would re-check the session and could re-navigate mid-flow. expo-router's
    // router reference is stable across renders anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagline = "Every contribution, big or small, brings a family closer to hope.";
  const getStarted = "Get Started";

  return (
    <View style={styles.container}>
      {/* Android's status bar has its own opaque background by default,
          unlike iOS (always transparent-over-content) — without this it
          shows a visible seam against the full-bleed gradient below. */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Deep dual-tone gradient background */}
      <LinearGradient
        colors={['#FF3B3B', '#EC2028', '#7A0D12', '#3D0709']}
        locations={[0, 0.32, 0.68, 1]}
        start={{ x: 0.33, y: 0.03 }}
        end={{ x: 0.67, y: 0.97 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Soft radial-style highlight, upper-left */}
      <LinearGradient
        colors={['rgba(255,140,140,0.5)', 'rgba(255,140,140,0)']}
        start={{ x: 0.3, y: -0.1 }}
        end={{ x: 0.75, y: 0.7 }}
        style={[StyleSheet.absoluteFillObject, styles.highlight]}
      />

      <View style={styles.content}>
        <Text style={styles.brand}>Karunya Kiranam</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>{tagline}</Text>
      </View>

      <View style={styles.bottomContainer}>
        {checkingSession ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Button
            title={getStarted}
            onPress={() => router.push('/login')}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3D0709',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 44,
  },
  highlight: {
    height: '65%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  brand: {
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 12,
    textAlign: 'center',
  },
  divider: {
    width: 36,
    height: 3,
    backgroundColor: '#EC2028',
    borderRadius: 2,
    marginBottom: 16,
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
    maxWidth: 280,
  },
  bottomContainer: {
    width: '100%',
  },
});
