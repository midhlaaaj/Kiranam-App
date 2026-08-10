import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { validateRequired } from '@/utils/validators';
import { friendlyError } from '@/utils/errors';
import { ArrowLeft, HeartHandshake, Check } from 'lucide-react-native';

export default function VolunteerApplicationScreen() {
  const router = useRouter();
  const { applyForVolunteer } = useApp();
  const [motivation, setMotivation] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const motivationError = validateRequired(motivation, 'Motivation');
    if (motivationError) {
      setError('Tell us a little about why you want to volunteer');
      return;
    }
    if (!agreed) {
      setError('Please agree to the volunteer code of conduct');
      return;
    }
    setError('');
    setSubmitting(true);
    const { error: applyError } = await applyForVolunteer(motivation);
    setSubmitting(false);
    if (applyError) {
      setError(friendlyError(applyError));
      return;
    }
    router.replace('/pending');
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

        {/* Hero icon */}
        <View style={styles.iconBg}>
          <HeartHandshake size={26} color="#EC2028" strokeWidth={2} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Become a Kiranam Volunteer</Text>
        <Text style={styles.subtitle}>
          Recruit new members with your own referral code and track your impact from a dedicated dashboard.
        </Text>

        {/* Motivation Field */}
        <Input
          variant="underline"
          label="Why do you want to volunteer?"
          value={motivation}
          onChangeText={(text) => {
            setMotivation(text);
            setError('');
          }}
          placeholder="Share your motivation and any skills you'd like to contribute..."
          multiline
          numberOfLines={4}
        />

        {/* Agreement toggle */}
        <TouchableOpacity
          style={styles.agreeRow}
          onPress={() => {
            setAgreed(!agreed);
            setError('');
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed ? styles.checkboxChecked : null]}>
            {agreed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          </View>
          <Text style={styles.agreeText}>
            I agree to Kiranam&apos;s volunteer code of conduct and privacy policy.
          </Text>
        </TouchableOpacity>

        {/* Submit CTA */}
        <View style={styles.buttonContainer}>
          <Button
            title="Apply to Volunteer"
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
    marginBottom: 20,
  },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FBEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 25,
    color: '#0C0C0D',
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    lineHeight: 22,
    color: '#7A756E',
    marginBottom: 28,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#E4E1DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#EC2028',
    borderColor: '#EC2028',
  },
  agreeText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 19,
    color: '#7A756E',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 28,
    width: '100%',
  },
});
