import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { markVolunteerWelcomeSeen, resolveApprovedVolunteerRoute } from '@/utils/volunteerRouting';
import { PartyPopper } from 'lucide-react-native';

// Shown exactly once per volunteer, right after their application is
// approved — for both a fresh volunteer-only signup and an existing
// contributor who applied from their profile. Reached only via
// resolveApprovedVolunteerRoute(), which gates on markVolunteerWelcomeSeen
// having never been called for this uid; "Get Started" marks it seen and
// resolves the real next destination (that same function, called again,
// now returns the amount picker or the dashboard instead of this page).
export default function VolunteerWelcomeScreen() {
  const router = useRouter();
  const { userName } = useApp();
  const [continuing, setContinuing] = useState(false);

  const handleContinue = async () => {
    setContinuing(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setContinuing(false);
      return;
    }
    await markVolunteerWelcomeSeen(uid);
    const dest = await resolveApprovedVolunteerRoute(uid);
    router.replace(dest);
  };

  const firstName = userName.split(' ')[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.iconOuterRing}>
          <View style={styles.iconInnerRing}>
            <PartyPopper size={30} color="#EC2028" strokeWidth={2} />
          </View>
        </View>

        <Text style={styles.title}>
          Welcome, {firstName || 'there'} — you&apos;re officially a Kiranam volunteer.
        </Text>
        <Text style={styles.subtitle}>
          Your referral code is ready to share, and you can start inviting contributors right away.
        </Text>

        <View style={styles.buttonContainer}>
          <Button title="Get Started" onPress={handleContinue} loading={continuing} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FBEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconInnerRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 23,
    color: '#0C0C0D',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 300,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 24,
    color: '#7A756E',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 290,
  },
  buttonContainer: {
    width: '100%',
  },
});
