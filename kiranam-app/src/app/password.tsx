import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { validatePassword } from '@/utils/validators';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function PasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; mode?: string; isNew?: string }>();
  const email = params.email || '';
  const role = params.mode === 'volunteer' ? 'volunteer' : 'contributor';
  const isNew = params.isNew === '1';
  const { signUpWithEmail, signInWithEmail } = useApp();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isNew) {
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
      const { error: signUpError } = await signUpWithEmail(email, password);
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError);
        return;
      }
      router.push({ pathname: '/register', params: { role } });
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await signInWithEmail(email, password);
    if (signInError) {
      setSubmitting(false);
      setError(signInError);
      return;
    }

    // Existing accounts already have a full_name set from a previous
    // registration — skip straight in, mirroring the old otp.tsx routing.
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    const { data: profile } = uid
      ? await supabase.from('profiles').select('full_name, role').eq('id', uid).single()
      : { data: null };
    setSubmitting(false);

    if (!profile?.full_name) {
      router.push({ pathname: '/register', params: { role } });
      return;
    }

    const { data: application } = await supabase
      .from('volunteer_applications')
      .select('status')
      .eq('profile_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profile.role === 'volunteer' && application?.status === 'approved') {
      router.replace('/(volunteer-tabs)/dashboard');
    } else if (profile.role === 'volunteer' || application?.status === 'pending' || application?.status === 'approved') {
      router.replace('/pending');
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>

        <Text style={styles.title}>{isNew ? 'Create a password' : 'Enter your password'}</Text>
        <Text style={styles.subtitle}>{email}</Text>

        <Input
          label="Password"
          placeholder="Enter password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType={isNew ? 'newPassword' : 'password'}
          autoComplete={isNew ? 'new-password' : 'password'}
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

        {isNew && (
          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={(text) => {
              setError('');
              setConfirmPassword(text);
            }}
            rightElement={
              <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} hitSlop={8}>
                {showConfirmPassword ? <EyeOff size={19} color="#7A756E" /> : <Eye size={19} color="#7A756E" />}
              </TouchableOpacity>
            }
          />
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {!isNew && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
            activeOpacity={0.7}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotLinkText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <View style={styles.submitButtonContainer}>
          <Button
            title={isNew ? 'Create Account' : 'Log In'}
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
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
    marginBottom: 28,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#BA1A1A',
    marginTop: -8,
    marginBottom: 12,
  },
  forgotLink: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  forgotLinkText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EC2028',
  },
  submitButtonContainer: {
    marginTop: 'auto',
    width: '100%',
  },
});
