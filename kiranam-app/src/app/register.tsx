import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Localization from 'expo-localization';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { CountryCodePicker } from '@/components/CountryCodePicker';
import { getCountryByIso2 } from '@/utils/countries';
import { validateRequired, validatePhoneNumber, validateReferralCode } from '@/utils/validators';
import { friendlyError } from '@/utils/errors';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react-native';

// Default the country picker to the device's own region instead of always
// showing India — most users then never need to touch it at all.
const deviceDefaultCountry = () => {
  const regionCode = Localization.getLocales()[0]?.regionCode;
  return (regionCode && getCountryByIso2(regionCode)) || getCountryByIso2('IN')!;
};

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'volunteer' ? 'volunteer' : 'contributor';
  const { saveProfile } = useApp();
  const [name, setName] = useState('');
  const [country, setCountry] = useState(deviceDefaultCountry);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showReferralField, setShowReferralField] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; refCode?: string; terms?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    const nameError = validateRequired(name, 'Full Name');
    const phoneError = validatePhoneNumber(phoneNumber, country.iso2 as any);
    const refCodeError = showReferralField ? validateReferralCode(refCode) : null;
    if (nameError || phoneError || refCodeError) {
      setErrors({ name: nameError || undefined, phone: phoneError || undefined, refCode: refCodeError || undefined });
      return;
    }
    if (!agreedToTerms) {
      setErrors({ terms: 'Please accept the Terms & Conditions and Privacy Policy to continue.' });
      return;
    }
    const phoneE164 = '+' + country.dialCode + phoneNumber.replace(/\D/g, '');
    setSubmitting(true);
    // Always save as 'contributor' here, even when the person picked
    // "volunteer" — that only reflects their *intent* to apply. The real
    // 'volunteer' role is granted by an admin approving the application
    // (kiranam-admin's volunteers/actions.ts), not at signup. Setting it
    // here early let people get full volunteer-tab access — or get stuck
    // in a half-registered state with no reviewable application — just by
    // abandoning the next screen before actually applying.
    const { error } = await saveProfile({ fullName: name, phone: phoneE164, role: 'contributor', whatsappConsent, referralCode: refCode });
    setSubmitting(false);
    if (error) {
      // Network/server failures aren't about anything the person typed, so
      // they don't belong pinned to the Full Name field — that previously
      // left the raw `TypeError: Network request failed` message sitting
      // under an unrelated input (or invisible, depending on the OS's
      // default uncaught-error toast). Route those to a proper banner with
      // a human-readable message instead; keep field-shaped errors inline.
      if (/network request failed/i.test(error)) {
        setToastMessage(friendlyError(error));
      } else {
        setErrors({ name: error });
      }
      return;
    }

    if (role === 'volunteer') {
      router.push('/volunteer-application');
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

        {/* Mobile Number Field */}
        <Text style={styles.inputLabel}>Mobile Number</Text>
        <View style={styles.phoneInputRow}>
          <TouchableOpacity
            style={styles.countryCodeBox}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.countryCodeText}>{country.flag} +{country.dialCode}</Text>
            <ChevronDown size={14} color="#7A756E" />
          </TouchableOpacity>
          <View style={styles.numberInputContainer}>
            <Input
              variant="underline"
              placeholder="Phone number"
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={15}
              value={phoneNumber}
              onChangeText={(text) => {
                setErrors((prev) => ({ ...prev, phone: undefined }));
                setPhoneNumber(text.replace(/[^0-9]/g, ''));
              }}
              onBlur={() => {
                const phoneError = phoneNumber ? validatePhoneNumber(phoneNumber, country.iso2 as any) : undefined;
                setErrors((prev) => ({ ...prev, phone: phoneError || undefined }));
              }}
              error={errors.phone}
              containerStyle={styles.phoneNumberInputContainer}
              inputStyle={{ fontWeight: '700' }}
            />
          </View>
        </View>
        <Text style={styles.helperText}>We&apos;ll use this to send you updates over WhatsApp.</Text>

        <CountryCodePicker
          visible={pickerVisible}
          selectedIso2={country.iso2}
          onSelect={(c) => {
            setCountry(c);
            setErrors((prev) => ({ ...prev, phone: undefined }));
          }}
          onClose={() => setPickerVisible(false)}
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
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#7A756E',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
    marginBottom: 10,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E4E1DC',
  },
  countryCodeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#0C0C0D',
  },
  numberInputContainer: {
    flex: 1,
  },
  phoneNumberInputContainer: {
    marginBottom: 0,
  },
  helperText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#B0ADA8',
    marginTop: 8,
    marginBottom: 20,
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
