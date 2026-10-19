import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenHeader } from '@/components/ScreenHeader';
import { validateRequired, validateEmail } from '@/utils/validators';
import { friendlyError } from '@/utils/errors';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { userName, phone, userEmail, isEmailVerified, updateName, updateEmail } = useApp();
  // `null` means "not edited yet" — the field then follows the account value,
  // so it fills in once the profile finishes loading instead of staying blank.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [saving, setSaving] = useState(false);

  const name = nameDraft ?? userName;
  const email = emailDraft ?? userEmail;
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const nameChanged = trimmedName !== userName;
  // Clearing the email isn't supported (it's optional to add, not to remove),
  // so an empty field is simply "unchanged".
  const emailChanged = !!trimmedEmail && trimmedEmail !== userEmail;
  const isDirty = nameChanged || emailChanged;

  const handleSave = async () => {
    if (validateRequired(name, 'Name')) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    const emailValidationError = trimmedEmail ? validateEmail(trimmedEmail) : null;
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }
    setEmailError('');
    setSaving(true);

    try {
      if (nameChanged) {
        const { error } = await updateName(trimmedName);
        if (error) {
          Alert.alert('Could not save changes', friendlyError(error));
          return;
        }
      }

      // Only when the address actually changed — it sends a real confirmation
      // email, which shouldn't refire on a name-only save. Name goes first so
      // a failure here never leaves the user unsure what was saved.
      if (emailChanged) {
        const { error } = await updateEmail(trimmedEmail);
        if (error) {
          Alert.alert(
            'Could not update email',
            `${nameChanged ? 'Your name was saved, but your' : 'Your'} email wasn't changed. ${friendlyError(error)}`
          );
          return;
        }
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save changes', friendlyError(e instanceof Error ? e.message : 'Something went wrong.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Personal Information" />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.sectionCard}>
          <Input label="Name" value={name} onChangeText={setNameDraft} placeholder="Your name" />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <View style={styles.lockedRow}>
              <Text style={styles.lockedValue}>{phone || 'Not set'}</Text>
              <Lock size={14} color="#B0ADA8" />
            </View>
          </View>

          <View style={styles.emailLabelRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            {!!userEmail && (
              <View style={[styles.badge, isEmailVerified ? styles.badgeVerified : styles.badgePending]}>
                <Text style={[styles.badgeText, isEmailVerified ? styles.badgeTextVerified : styles.badgeTextPending]}>
                  {isEmailVerified ? 'Verified' : 'Pending verification'}
                </Text>
              </View>
            )}
          </View>
          <Input
            value={email}
            onChangeText={(text) => {
              setEmailDraft(text);
              setEmailError('');
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <Button title="Save Changes" onPress={handleSave} loading={saving} disabled={!isDirty} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF0F1' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    padding: 16,
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 12,
    color: '#7A756E',
    marginBottom: 6,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F2EF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F1EEEA',
    height: 56,
    paddingHorizontal: 20,
  },
  lockedValue: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#7A756E',
  },
  emailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeVerified: { backgroundColor: '#E5F5EA' },
  badgePending: { backgroundColor: '#F1EEEA' },
  badgeText: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 11,
  },
  badgeTextVerified: { color: '#22A559' },
  badgeTextPending: { color: '#7A756E' },
});
