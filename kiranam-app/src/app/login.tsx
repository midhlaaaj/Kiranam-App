import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { validateEmail } from '@/utils/validators';
import { ArrowLeft } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'volunteer' ? 'volunteer' : 'contributor';
  const [mode, setMode] = useState<'contributor' | 'volunteer'>(role);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    const emailError = validateEmail(email, { required: true });
    if (emailError) {
      setError(emailError);
      return;
    }
    const trimmed = email.trim().toLowerCase();
    setSubmitting(true);
    // Figure out up front whether this is a returning login or a brand new
    // signup, so the next screen can show the right fields (just Password +
    // "Forgot password?" vs Password + Confirm Password) without a second
    // round trip once the user starts typing their password.
    const { data: exists, error: checkError } = await supabase.rpc('email_has_account', { p_email: trimmed });
    setSubmitting(false);
    if (checkError) {
      setError('Something went wrong. Please try again.');
      return;
    }
    router.push({ pathname: '/password', params: { email: trimmed, mode, isNew: exists ? '0' : '1' } });
  };

  const handleToggleMode = () => {
    setError('');
    setMode((prev) => (prev === 'contributor' ? 'volunteer' : 'contributor'));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>

        <Text style={styles.title}>
          {mode === 'volunteer' ? (
            <>Let&apos;s get you{"\n"}<Text style={styles.titleAccent}>volunteering</Text></>
          ) : (
            <>Let&apos;s get you{"\n"}<Text style={styles.titleAccent}>contributing</Text></>
          )}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'volunteer'
            ? 'Enter your email to continue as a volunteer.'
            : 'Enter your email to continue.'}
        </Text>

        <Input
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          value={email}
          onChangeText={(text) => {
            setError('');
            setEmail(text);
          }}
          error={error}
          containerStyle={styles.emailInputContainer}
        />

        <Button
          title="Continue"
          onPress={handleContinue}
          loading={submitting}
          style={styles.continueButton}
        />

        <TouchableOpacity onPress={handleToggleMode} activeOpacity={0.7} style={styles.volunteerLink}>
          <Text style={styles.volunteerLinkText}>
            {mode === 'volunteer' ? 'Start contributing instead?' : 'Want to volunteer instead?'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to Kiranam&apos;s Terms &amp; Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 34,
    color: '#0C0C0D',
    letterSpacing: -0.8,
    lineHeight: 48,
    marginBottom: 10,
  },
  titleAccent: {
    color: '#EC2028',
    fontSize: 40,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#7A756E',
    lineHeight: 22,
    marginBottom: 32,
  },
  emailInputContainer: {
    marginBottom: 24,
  },
  continueButton: {
    marginBottom: 24,
  },
  volunteerLink: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 8,
  },
  volunteerLinkText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0C0C0D',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#B0ADA8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
