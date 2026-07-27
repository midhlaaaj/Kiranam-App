import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

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

      if (profile.role === 'volunteer') {
        const { data: application } = await supabase
          .from('volunteer_applications')
          .select('status')
          .eq('profile_id', uid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) {
          router.replace(application?.status === 'approved' ? '/(volunteer-tabs)/dashboard' : '/pending');
        }
      } else if (!cancelled) {
        router.replace('/(tabs)/home');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const tagline = "Every contribution, big or small, brings a family closer to hope.";
  const getStarted = "Get Started";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

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
        <Text style={styles.brand}>Kiranam</Text>
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
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 46,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 12,
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
