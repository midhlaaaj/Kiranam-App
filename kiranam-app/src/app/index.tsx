import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { extractReferralCodeFromText, stashPendingReferralCode } from '@/utils/referral';
import { resolveEntryRoute } from '@/utils/volunteerRouting';

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
  const insets = useSafeAreaInsets();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // If a session is already saved on-device, skip the "Get Started" splash
  // entirely and land the user straight in — same destination logic as
  // otp.tsx's post-verify routing (full_name presence, then volunteer
  // approval status), since a returning user never goes through otp.tsx.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
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
        const dest = await resolveEntryRoute(uid);
        if (cancelled) return;
        router.replace(dest);
      } catch {
        // Offline or a Supabase error: don't strand the user on a spinner,
        // and don't guess a destination — offer a retry instead.
        if (!cancelled) {
          setLoadError(true);
          setCheckingSession(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately mount-once — re-running on every `router` identity change
    // would re-check the session and could re-navigate mid-flow. expo-router's
    // router reference is stable across renders anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const handleRetry = () => {
    setLoadError(false);
    setCheckingSession(true);
    setAttempt((n) => n + 1);
  };

  const tagline = "Every contribution, big or small, brings a family closer to hope.";
  const getStarted = "Get Started";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
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
        style={StyleSheet.absoluteFill}
      />
      {/* Soft radial-style highlight, upper-left */}
      <LinearGradient
        colors={['rgba(255,140,140,0.5)', 'rgba(255,140,140,0)']}
        start={{ x: 0.3, y: -0.1 }}
        end={{ x: 0.75, y: 0.7 }}
        style={[StyleSheet.absoluteFill, styles.highlight]}
      />

      <View style={styles.content}>
        <Text style={styles.brand}>Karunya Kiranam</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>{tagline}</Text>
      </View>

      <View style={styles.bottomContainer}>
        {checkingSession ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : loadError ? (
          <>
            <Text style={styles.errorText}>Couldn&apos;t load your account. Check your connection and try again.</Text>
            <Button title="Try again" onPress={handleRetry} />
          </>
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
  errorText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
});
