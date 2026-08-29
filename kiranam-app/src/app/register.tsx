import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { validateRequired, validateReferralCode } from '@/utils/validators';
import { friendlyError } from '@/utils/errors';
import { peekPendingReferralCode } from '@/utils/referral';
import { ArrowLeft, Check } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'volunteer' ? 'volunteer' : 'contributor';
  const { phone, saveProfile } = useApp();
  const [name, setName] = useState('');
  const [showReferralField, setShowReferralField] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; refCode?: string; terms?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // A code captured from a /join link (or the iOS clipboard fallback) gets
  // redeemed automatically at signup regardless of this field — this just
  // surfaces it so the person can see it was picked up rather than
  // wondering whether they still need to type one in.
  useEffect(() => {
    if (role !== 'contributor') return;
    peekPendingReferralCode().then((code) => {
      if (code) {
        setRefCode(code);
        setShowReferralField(true);
      }
    });
  }, [role]);

  const handleCreateAccount = async () => {
    const nameError = validateRequired(name, 'Full Name');
    const refCodeError = showReferralField ? validateReferralCode(refCode) : null;
    if (nameError || refCodeError) {
      setErrors({ name: nameError || undefined, refCode: refCodeError || undefined });
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
    // `phone` is already known and OTP-verified from the login step — no
    // need to ask for it again here.
    const { error } = await saveProfile({ fullName: name, phone, role: 'contributor', whatsappConsent, referralCode: refCode });
    setSubmitting(false);
    if (error) {
      // Network/server failures (and raw backend errors like a Postgres
      // constraint violation) aren't about anything the person typed, so
      // they don't belong pinned to the Full Name field — that previously
      // left messages like `TypeError: Network request failed`, or worse
      // `duplicate key value violates unique constraint "profiles_phone_key"`,
      // sitting under an unrelated input. Route those to a proper banner
      // with a human-readable message instead; keep genuinely field-shaped
      // errors inline.
      const cleaned = friendlyError(error);
      if (cleaned !== error) {
        // friendlyError actually rewrote something — it was a raw/system
        // error, not a real field-validation message, so it belongs in
        // the banner.
        setToastMessage(cleaned);
      } else {
        setErrors({ name: error });
      }
      return;
    }

    if (role === 'volunteer') {
      // No amount picker yet — a volunteer applicant isn't a volunteer
      // until an admin approves them, so asking for a monthly commitment
      // now would be premature. That happens once, right after approval —
      // see otp.tsx/index.tsx's post-login routing.
      // `replace`, not `push` — register must not remain in the back
      // stack, same reasoning as otp.tsx not remaining in it: once past
      // this step, back must not return the person to an earlier part of
      // signup they've already completed.
      router.replace('/volunteer-application');
    } else {
      // New contributors land on the amount picker first, not Home directly —
      // otherwise most people never set up a monthly commitment at all.
      router.replace({ pathname: '/choose-amount', params: { onboarding: '1' } });
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
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder="Enter your full name"
          error={errors.name}
        />

        {/* Referral Code — collapsed by default, contributors only */}
        {role === 'contributor' && (
          showReferralField ? (
            <Input
              variant="underline"
              label="Referral Code"
              value={refCode}
              onChangeText={(text) => {
                setRefCode(text);
                setErrors((prev) => ({ ...prev, refCode: undefined }));
              }}
              placeholder="Enter referral code"
              autoCapitalize="characters"
              error={errors.refCode}
            />
          ) : (
            <TouchableOpacity onPress={() => setShowReferralField(true)} activeOpacity={0.7} style={styles.referralToggle}>
              <Text style={styles.referralToggleText}>Have a referral code?</Text>
            </TouchableOpacity>
          )
        )}

        {/* Consent checkboxes */}
        <View style={styles.consentGroup}>
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
        </View>
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
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
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
    fontFamily: 'Inter-Bold',
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
  referralToggle: {
    marginBottom: 20,
  },
  referralToggleText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EC2028',
  },
  consentGroup: {
    marginTop: 4,
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
