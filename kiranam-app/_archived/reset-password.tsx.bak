import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { validatePassword } from '@/utils/validators';
import { friendlyError } from '@/utils/errors';
import { Eye, EyeOff } from 'lucide-react-native';

// Landed on from the "reset your password" email, via kiranam-admin's
// mobile-auth-bridge route — see AppContext.tsx's requestPasswordReset.
// access_token/refresh_token arrive as query params on this deep link.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!params.access_token || !params.refresh_token) {
      setError('This reset link is invalid or has expired. Please request a new one.');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (sessionError) {
      setSubmitting(false);
      setError('This reset link is invalid or has expired. Please request a new one.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(friendlyError(updateError.message));
      return;
    }

    router.replace('/(tabs)/home');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account.</Text>

        <Input
          label="New Password"
          placeholder="Enter new password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType="newPassword"
          autoComplete="new-password"
          value={password}
          onChangeText={(text) => {
            setError('');
            setPassword(text);
          }}
          rightElement={
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
              {showPassword ? <EyeOff size={19} color="#7A756E" /> : <Eye size={19} color="#7A756E" />}
            </TouchableOpacity>
          }
        />
        <Input
          label="Confirm Password"
          placeholder="Re-enter new password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType="newPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={(text) => {
            setError('');
            setConfirmPassword(text);
          }}
        />

        <View style={styles.submitButtonContainer}>
          <Button title="Update Password" onPress={handleSubmit} loading={submitting} />
        </View>
      </ScrollView>
      <Toast message={error || null} onDismiss={() => setError('')} />
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
    paddingTop: 80,
    paddingBottom: 24,
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
  submitButtonContainer: {
    marginTop: 8,
  },
});
