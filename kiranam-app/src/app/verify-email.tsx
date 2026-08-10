import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Mail } from 'lucide-react-native';

const RESEND_COOLDOWN_SECONDS = 60;

// Landed on right after signUpWithEmail — the account exists but has no
// session yet (see AppContext.tsx), so there's nothing to do here except
// wait for the confirmation link, which deep-links into email-verified.tsx.
export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; role?: string }>();
  const email = params.email || '';
  const role = params.role === 'volunteer' ? 'volunteer' : 'contributor';
  const { resendSignupVerification } = useApp();

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    setResending(true);
    setMessage('');
    const { error } = await resendSignupVerification(email, role);
    setResending(false);
    if (error) {
      setMessage(error);
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setMessage('Verification email sent.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.iconBg}>
          <Mail size={28} color="#EC2028" />
        </View>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We&apos;ve sent a confirmation link to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
          {'\n'}Tap it to activate your account.
        </Text>

        {!!message && <Text style={styles.message}>{message}</Text>}

        <TouchableOpacity onPress={handleResend} disabled={resending || cooldown > 0} activeOpacity={0.7}>
          <Text style={[styles.resendLink, (resending || cooldown > 0) && styles.resendLinkDisabled]}>
            {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.7} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to start</Text>
        </TouchableOpacity>
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
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 21,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  emailText: {
    fontWeight: '700',
    color: '#0C0C0D',
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#7A756E',
    marginBottom: 12,
    textAlign: 'center',
  },
  resendLink: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#EC2028',
    marginBottom: 24,
  },
  resendLinkDisabled: {
    color: '#B0ADA8',
  },
  backLink: {
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#7A756E',
  },
});
