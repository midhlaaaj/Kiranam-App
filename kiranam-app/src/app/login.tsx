import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { CountryCodePicker } from '@/components/CountryCodePicker';
import { getCountryByIso2 } from '@/utils/countries';
import { validatePhoneNumber } from '@/utils/validators';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { setPhone, signInWithPhone } = useApp();
  const [mode, setMode] = useState<'contributor' | 'volunteer'>('contributor');
  const [country, setCountry] = useState(getCountryByIso2('IN')!);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validatePhone = () => {
    const err = validatePhoneNumber(phoneNumber, country.iso2 as any);
    setError(err || '');
    return !err;
  };

  const handleContinue = async () => {
    if (!validatePhone()) return;
    const phoneE164 = '+' + country.dialCode + phoneNumber.replace(/\D/g, '');
    setSubmitting(true);
    const { error: otpError } = await signInWithPhone(phoneE164);
    setSubmitting(false);
    if (otpError) {
      setError(otpError);
      return;
    }
    setPhone(phoneE164);
    router.push({ pathname: '/otp', params: { role: mode } });
  };

  const handleToggleMode = () => {
    setError('');
    setMode((prev) => (prev === 'contributor' ? 'volunteer' : 'contributor'));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>

        {/* Headers */}
        <Text style={styles.title}>
          {mode === 'volunteer' ? (
            <>Let&apos;s get you{"\n"}<Text style={styles.titleAccent}>volunteering</Text></>
          ) : (
            <>Let&apos;s get you{"\n"}<Text style={styles.titleAccent}>contributing</Text></>
          )}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'volunteer'
            ? 'Enter your phone number to continue as a volunteer.'
            : 'Enter your phone number to continue.'}
        </Text>

        {/* Custom Phone Number Input Row */}
        <Text style={styles.inputLabel}>Phone Number</Text>
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
              placeholder="Phone number"
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={15}
              value={phoneNumber}
              onChangeText={(text) => {
                setError('');
                const formatted = text.replace(/[^0-9]/g, '');
                setPhoneNumber(formatted);
              }}
              error={error}
              containerStyle={{ marginBottom: 0 }}
              inputStyle={{ fontWeight: '700' }}
              wrapperStyle={styles.phoneInputWrapper}
            />
          </View>
        </View>

        <CountryCodePicker
          visible={pickerVisible}
          selectedIso2={country.iso2}
          onSelect={(c) => {
            setCountry(c);
            setError('');
          }}
          onClose={() => setPickerVisible(false)}
        />

        {/* Continue CTA */}
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={submitting}
          style={styles.continueButton}
        />

        {/* Mode toggle */}
        <TouchableOpacity onPress={handleToggleMode} activeOpacity={0.7} style={styles.volunteerLink}>
          <Text style={styles.volunteerLinkText}>
            {mode === 'volunteer' ? 'Start contributing instead?' : 'Want to volunteer instead?'}
          </Text>
        </TouchableOpacity>

        {/* Terms footer */}
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
    marginBottom: 24,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
    // Subtle shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
  phoneInputWrapper: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
