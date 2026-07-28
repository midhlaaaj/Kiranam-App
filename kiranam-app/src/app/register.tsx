import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Check } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'volunteer' ? 'volunteer' : 'contributor';
  const { saveProfile, setReferralCode } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [refCode, setRefCode] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; terms?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleCreateAccount = async () => {
    if (!name.trim()) {
      setErrors({ name: 'Full Name is required' });
      return;
    }
    if (!agreedToTerms) {
      setErrors({ terms: 'Please accept the Terms & Conditions and Privacy Policy to continue.' });
      return;
    }
    setSubmitting(true);
    // Always save as 'contributor' here, even when the person picked
    // "volunteer" — that only reflects their *intent* to apply. The real
    // 'volunteer' role is granted by an admin approving the application
    // (kiranam-admin's volunteers/actions.ts), not at signup. Setting it
    // here early let people get full volunteer-tab access — or get stuck
    // in a half-registered state with no reviewable application — just by
    // abandoning the next screen before actually applying.
    const { error } = await saveProfile({ fullName: name, email, role: 'contributor', whatsappConsent });
    setSubmitting(false);
    if (error) {
      setErrors({ name: error });
      return;
    }
    setReferralCode(refCode);

    if (role === 'volunteer') {
      router.push('/volunteer-application');
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>A few details to set up your account.</Text>

        {/* Name Field */}
        <Input
          variant="underline"
          label="Full Name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setErrors({});
          }}
          placeholder="Enter your full name"
          error={errors.name}
        />

        {/* Email Field */}
        <Input
          variant="underline"
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Referral Code Field — contributors only; volunteers generate their own code */}
        {role === 'contributor' && (
          <Input
            variant="underline"
            label="Referral Code (optional)"
            value={refCode}
            onChangeText={setRefCode}
            placeholder="Enter referral code"
            autoCapitalize="characters"
          />
        )}

        {/* Consent checkboxes */}
        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.7}
          onPress={() => setWhatsappConsent((prev) => !prev)}
        >
          <View style={[styles.checkbox, whatsappConsent && styles.checkboxChecked]}>
            {whatsappConsent && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I&apos;d like to receive contribution reminders over WhatsApp.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.7}
          onPress={() => {
            setAgreedToTerms((prev) => !prev);
            setErrors((prev) => ({ ...prev, terms: undefined }));
          }}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the{' '}
            <Text style={styles.checkboxLink} onPress={() => router.push('/terms')}>
              Terms &amp; Conditions
            </Text>{' '}
            and{' '}
            <Text style={styles.checkboxLink} onPress={() => router.push('/privacy-policy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </TouchableOpacity>
        {errors.terms && <Text style={styles.consentError}>{errors.terms}</Text>}

        {/* Continue CTA */}
        <View style={styles.buttonContainer}>
          <Button
            title="Create Account"
            onPress={handleCreateAccount}
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D8D5D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#EC2028',
    borderColor: '#EC2028',
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 19,
    color: '#4A4642',
  },
  checkboxLink: {
    fontWeight: '700',
    color: '#EC2028',
    textDecorationLine: 'underline',
  },
  consentError: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#BA1A1A',
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 'auto',
    width: '100%',
  },
});
