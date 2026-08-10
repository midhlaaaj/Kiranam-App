import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { validateEmail } from '@/utils/validators';
import { ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { requestPasswordReset } = useApp();
  const [email, setEmail] = useState(params.email || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const emailError = validateEmail(email, { required: true });
    if (emailError) {
      setError(emailError);
      return;
    }
    setSubmitting(true);
    await requestPasswordReset(email.trim().toLowerCase());
    setSubmitting(false);
    // Same message whether or not the address has an account — never
    // reveal which emails are registered, mirroring kiranam-admin's flow.
    setSent(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>

        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>Enter your email and we&apos;ll send you a reset link.</Text>

        {sent ? (
          <Text style={styles.sentText}>
            If that email has an account, a reset link is on its way. Check your inbox.
          </Text>
        ) : (
          <>
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
            />
            <View style={styles.submitButtonContainer}>
              <Button title="Send Reset Link" onPress={handleSubmit} loading={submitting} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 25,
    color: '#0C0C0D',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    lineHeight: 20,
    marginBottom: 28,
  },
  sentText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#0C0C0D',
    lineHeight: 22,
    backgroundColor: '#F9F8F6',
    borderRadius: 16,
    padding: 16,
  },
  submitButtonContainer: {
    marginTop: 8,
  },
});
