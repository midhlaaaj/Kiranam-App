import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { validatePassword, validateEmail } from '@/utils/validators';
import { friendlyError } from '@/utils/errors';
import { ArrowLeft, Eye, EyeOff, Pencil, X, Check } from 'lucide-react-native';

export default function PasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; mode?: string; isNew?: string }>();
  const role = params.mode === 'volunteer' ? 'volunteer' : 'contributor';
  const isNew = params.isNew === '1';
  const { signUpWithEmail, signInWithEmail } = useApp();

  const [email, setEmail] = useState(params.email || '');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleStartEditEmail = () => {
    setEmailError('');
    setDraftEmail(email);
    setIsEditingEmail(true);
  };

  const handleCancelEditEmail = () => {
    setEmailError('');
    setIsEditingEmail(false);
  };

  const handleSaveEmail = () => {
    const err = validateEmail(draftEmail, { required: true });
    if (err) {
      setEmailError(err);
      return;
    }
    setEmail(draftEmail.trim().toLowerCase());
    setIsEditingEmail(false);
  };

  const handleSubmit = async () => {
    if (isNew) {
      const passwordValidationError = validatePassword(password);
      if (passwordValidationError) {
        setPasswordError(passwordValidationError);
        return;
      }
      if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      const { error: signUpError } = await signUpWithEmail(email, password, role);
      setSubmitting(false);
      if (signUpError) {
        setError(friendlyError(signUpError));
        return;
      }
      // Account isn't usable yet — Supabase withholds a session until the
      // confirmation link is clicked (see signUpWithEmail). Registration
      // details are collected after that, once email-verified.tsx has a
      // session to save them against.
      router.replace({ pathname: '/verify-email', params: { email, role } });
      return;
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    const { error: signInError, code: signInErrorCode } = await signInWithEmail(email, password);
    if (signInError) {
      setSubmitting(false);
      if (signInErrorCode === 'email_not_confirmed') {
        // Password was right — this account just never finished the signup
        // confirmation (abandoned the app before tapping the link, or a
        // link that failed to deliver). Send them back to verify rather
        // than dead-ending on an error with no obvious next step.
        router.replace({ pathname: '/verify-email', params: { email, role } });
        return;
      }
      setPasswordError(friendlyError(signInError));
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

        {isEditingEmail ? (
          <>
            <View style={styles.emailEditPill}>
              <TextInput
                style={styles.emailEditInput}
                placeholder="you@example.com"
                placeholderTextColor="#B0ADA8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                value={draftEmail}
                autoFocus
                onChangeText={(text) => {
                  setEmailError('');
                  setDraftEmail(text);
                }}
              />
              <TouchableOpacity style={styles.cancelEmailButton} onPress={handleCancelEditEmail} hitSlop={8}>
                <X size={17} color="#7A756E" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmEmailButton} onPress={handleSaveEmail} activeOpacity={0.8}>
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </>
        ) : (
          <TouchableOpacity style={styles.emailViewPill} onPress={handleStartEditEmail} activeOpacity={0.7}>
            <Text style={styles.emailPillText} numberOfLines={1}>{email}</Text>
            <View style={styles.editIconBg}>
              <Pencil size={12} color="#7A756E" />
            </View>
          </TouchableOpacity>
        )}

        <Input
          label="Password"
          placeholder="Enter password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType={isNew ? 'newPassword' : 'password'}
          autoComplete={isNew ? 'new-password' : 'password'}
          value={password}
          error={passwordError}
          onChangeText={(text) => {
            setPasswordError('');
            setConfirmPasswordError('');
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
            error={confirmPasswordError}
            onChangeText={(text) => {
              setConfirmPasswordError('');
              setConfirmPassword(text);
            }}
            rightElement={
              <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} hitSlop={8}>
                {showConfirmPassword ? <EyeOff size={19} color="#7A756E" /> : <Eye size={19} color="#7A756E" />}
              </TouchableOpacity>
            }
          />
        )}

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
  emailViewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 10,
    backgroundColor: '#F9F8F6',
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 8,
    height: 44,
    marginBottom: 28,
  },
  emailPillText: {
    flexShrink: 1,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15.5,
    color: '#0C0C0D',
    letterSpacing: -0.2,
  },
  editIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F8F6',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#EC2028',
    paddingLeft: 16,
    paddingRight: 6,
    height: 48,
    gap: 8,
    marginBottom: 28,
  },
  emailEditInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#0C0C0D',
    padding: 0,
    height: '100%',
  },
  cancelEmailButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmEmailButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EC2028',
    alignItems: 'center',
    justifyContent: 'center',
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
