import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { CheckCircle2, XCircle } from 'lucide-react-native';

// Landed on from the "confirm your email" link, via kiranam-admin's shared
// /auth/confirm route — see AppContext.tsx's signUpWithEmail. access_token/
// refresh_token arrive as query params on this deep link; applying them is
// what finally grants the session saveProfile (register.tsx) needs, since
// signUp() withheld one until this link was clicked.
export default function EmailVerifiedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string; role?: string }>();
  const role = params.role === 'volunteer' ? 'volunteer' : 'contributor';
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    if (!params.access_token || !params.refresh_token) {
      setStatus('error');
      return;
    }
    supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    }).then(({ error }) => setStatus(error ? 'error' : 'success'));
  }, [params.access_token, params.refresh_token]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {status === 'error' ? (
          <>
            <XCircle size={56} color="#BA1A1A" />
            <Text style={styles.title}>Verification link invalid</Text>
            <Text style={styles.subtitle}>This link is invalid or has expired. Please request a new one.</Text>
          </>
        ) : (
          <>
            <CheckCircle2 size={56} color="#22A559" />
            <Text style={styles.title}>{status === 'success' ? 'Email verified' : 'Verifying…'}</Text>
            <Text style={styles.subtitle}>
              {status === 'success'
                ? 'Your email address has been confirmed. Let’s finish setting up your account.'
                : 'Hang tight while we confirm your email.'}
            </Text>
          </>
        )}
        {status !== 'verifying' && (
          <View style={styles.buttonContainer}>
            <Button
              title="Continue"
              onPress={() =>
                router.replace(
                  status === 'success' ? { pathname: '/register', params: { role } } : '/'
                )
              }
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 21,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 32,
  },
});
