import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { CountryCodePicker } from '@/components/CountryCodePicker';
import { COUNTRIES, getCountryByIso2 } from '@/utils/countries';
import { validatePhoneNumber } from '@/utils/validators';
import { resolvePostAuthRoute } from '@/utils/volunteerRouting';
import { ArrowLeft, Pencil, Check, X, ChevronDown } from 'lucide-react-native';

// Longest dial codes first, so e.g. "971" matches before "97" would.
const SORTED_DIAL_CODES = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

function countryFromE164(phoneE164: string) {
  const digits = phoneE164.replace('+', '');
  const match = SORTED_DIAL_CODES.find((c) => digits.startsWith(c.dialCode));
  return match || getCountryByIso2('IN')!;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'volunteer' ? 'volunteer' : 'contributor';
  const { phone, setPhone, signInWithPhone, verifyOtpCode } = useApp();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [draftCountry, setDraftCountry] = useState(() => countryFromE164(phone));
  const [draftPhone, setDraftPhone] = useState(() => phone.replace('+' + draftCountry.dialCode, ''));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // References for shifting focus
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Countdown timer for resending OTP
  useEffect(() => {
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTextChange = (text: string, index: number) => {
    // Only accept numbers
    const clean = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = clean;
    setOtp(newOtp);

    // Auto-focus next input
    if (clean && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Detect backspace to delete previous box
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleResend = async (phoneE164?: string) => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    // Countdown only resets on a *confirmed* send — otherwise a rejected
    // resend (e.g. blocked by the server-side OTP rate limit) would silently
    // look like it worked, with no way to tell the user actually got nothing.
    const { error: resendError } = await signInWithPhone(phoneE164 || phone);
    if (resendError) {
      setError(resendError);
      return;
    }
    setResendSeconds(30);
    inputRefs[0].current?.focus();
  };

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
  };

  const handleStartEditPhone = () => {
    animateLayout();
    const c = countryFromE164(phone);
    setDraftCountry(c);
    setDraftPhone(phone.replace('+' + c.dialCode, ''));
    setError('');
    setIsEditingPhone(true);
  };

  const handleCancelEditPhone = () => {
    animateLayout();
    setError('');
    setIsEditingPhone(false);
  };

  const handleSavePhone = () => {
    const phoneErr = validatePhoneNumber(draftPhone, draftCountry.iso2 as any);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    animateLayout();
    const phoneE164 = '+' + draftCountry.dialCode + draftPhone.replace(/\D/g, '');
    setPhone(phoneE164);
    setIsEditingPhone(false);
    handleResend(phoneE164);
  };

  const isOtpFilled = otp.every((val) => val !== '');

  const handleVerify = async () => {
    if (!isOtpFilled) return;
    setVerifying(true);
    const code = otp.join('');
    const { error: verifyError } = await verifyOtpCode(phone, code);
    if (verifyError) {
      setVerifying(false);
      setError(verifyError);
      return;
    }

    // Existing accounts (e.g. re-login, or admin-registered contributors
    // claiming their login) already have a full_name set by a previous
    // registration — skip "Tell us about yourself" and go straight in.
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setVerifying(false);
      setError('Something went wrong. Please try again.');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', uid).single();
    setVerifying(false);

    if (profile?.full_name) {
      const dest = await resolvePostAuthRoute(uid);
      // `replace` alone only swaps the current (otp) entry — splash and the
      // mobile-number screen pushed before it stay underneath, so hardware
      // back from home would land a signed-in user back on the phone-entry
      // screen. dismissAll() first collapses the stack to its root before
      // replace() swaps that root entry, leaving nothing to go back to.
      router.dismissAll();
      router.replace(dest);
      return;
    }

    // New account: proceed to Registration Screen, carrying the chosen role forward.
    // Same dismissAll()+replace() as above — otp (and everything before it)
    // must not remain in the back stack, or the hardware back button would
    // return a signed-in user to the OTP or phone-entry screen.
    router.dismissAll();
    router.replace({ pathname: '/register', params: { role } });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Back navigation */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>

        {/* Welcome and description */}
        <Text style={styles.title}>Enter the code sent to</Text>

        {isEditingPhone ? (
          <>
            <View style={styles.phoneEditPill}>
              <TouchableOpacity
                style={styles.phonePillPrefixButton}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.phonePillPrefix}>{draftCountry.flag} +{draftCountry.dialCode}</Text>
                <ChevronDown size={12} color="#7A756E" />
              </TouchableOpacity>
              <TextInput
                style={styles.phoneEditInput}
                placeholder="Phone number"
                placeholderTextColor="#B0ADA8"
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={15}
                value={draftPhone}
                autoFocus
                onChangeText={(text) => {
                  setError('');
                  setDraftPhone(text.replace(/[^0-9]/g, ''));
                }}
              />
              <TouchableOpacity style={styles.cancelPhoneButton} onPress={handleCancelEditPhone} hitSlop={8}>
                <X size={17} color="#7A756E" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmPhoneButton} onPress={handleSavePhone} activeOpacity={0.8}>
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </>
        ) : (
          <TouchableOpacity style={styles.phoneViewPill} onPress={handleStartEditPhone} activeOpacity={0.7}>
            <Text style={styles.phonePillText}>{phone || '+91 98765 43210'}</Text>
            <View style={styles.editIconBg}>
              <Pencil size={12} color="#7A756E" />
            </View>
          </TouchableOpacity>
        )}

        <CountryCodePicker
          visible={pickerVisible}
          selectedIso2={draftCountry.iso2}
          onSelect={(c) => {
            setDraftCountry(c);
            setError('');
          }}
          onClose={() => setPickerVisible(false)}
        />

        <Text style={styles.subtitle}>A 6-digit code was sent via WhatsApp.</Text>

        {/* 6 code input fields */}
        <View style={styles.otpContainer}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={inputRefs[i]}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null
              ]}
              value={digit}
              onChangeText={(text) => handleTextChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              textContentType={i === 0 ? 'oneTimeCode' : 'none'}
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Resend Action */}
        {resendSeconds === 0 ? (
          <TouchableOpacity onPress={() => handleResend()} activeOpacity={0.7}>
            <Text style={styles.resendLink}>Resend code</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.resendTimer}>
            Resend code in {formatTime(resendSeconds)}
          </Text>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Verify CTA */}
        <View style={styles.verifyButtonContainer}>
          <Button
            title="Verify"
            onPress={handleVerify}
            disabled={!isOtpFilled}
            loading={verifying}
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
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 25,
    color: '#0C0C0D',
    letterSpacing: -0.6,
    lineHeight: 33,
    marginBottom: 12,
  },
  phoneViewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    backgroundColor: '#F9F8F6',
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 8,
    height: 44,
    marginBottom: 16,
  },
  phonePillText: {
    fontFamily: 'Inter-Bold',
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
  phoneEditPill: {
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
    marginBottom: 16,
  },
  phonePillPrefixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phonePillPrefix: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 15,
    color: '#0C0C0D',
  },
  phoneEditInput: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 15,
    color: '#0C0C0D',
    padding: 0,
    height: '100%',
  },
  cancelPhoneButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPhoneButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EC2028',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  otpInput: {
    width: 47,
    height: 58,
    backgroundColor: '#F9F8F6',
    borderBottomWidth: 3,
    borderBottomColor: '#E4E1DC',
    borderRadius: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 23,
    color: '#0C0C0D',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderBottomColor: '#EC2028',
  },
  resendLink: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#EC2028',
    marginBottom: 32,
  },
  resendTimer: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#B0ADA8',
    marginBottom: 32,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#BA1A1A',
    marginTop: -16,
    marginBottom: 20,
  },
  verifyButtonContainer: {
    marginTop: 'auto',
    width: '100%',
  },
});
