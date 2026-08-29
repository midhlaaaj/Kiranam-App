import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/Button';
import { markRejectionAcknowledged } from '@/utils/volunteerRouting';

// Reached (once per rejected application) via resolvePostAuthRoute/
// checkFreshRejection — for both a fresh volunteer-only signup and an
// existing contributor whose transition application was rejected. The
// CTA differs by which of those two this is: a fresh applicant has no
// giving set up yet, so the natural next step is contributing instead;
// an existing contributor already has full access and just needs to
// know their access wasn't interrupted.
export default function VolunteerRejectedScreen() {
  const router = useRouter();
  const { hasCommitment } = useApp();
  const [reason, setReason] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: application } = await supabase
        .from('volunteer_applications')
        .select('id, rejection_reason')
        .eq('profile_id', uid)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setApplicationId(application?.id ?? null);
      setReason(application?.rejection_reason ?? null);
    })();
  }, []);

  const handleContinue = async () => {
    setContinuing(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (uid && applicationId) {
      await markRejectionAcknowledged(uid, applicationId);
    }
    router.replace(
      hasCommitment
        ? '/(tabs)/home'
        // Without `onboarding: '1'`, choose-amount's Save button treats this
        // as "editing an existing commitment" and does router.back() — which
        // lands back on whatever was still under volunteer-rejected in the
        // stack (the mobile-number screen), not home. Marking it onboarding
        // routes Save (and Skip) to home instead, same as a fresh signup.
        : { pathname: '/choose-amount', params: { onboarding: '1', role: 'contributor' } }
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.iconOuterRing}>
          <View style={styles.iconInnerRing}>
            <XCircle size={28} color="#EC2028" strokeWidth={2} />
          </View>
        </View>

        <Text style={styles.title}>
          {hasCommitment ? "Your volunteer application wasn't approved" : "Your application wasn't approved this time"}
        </Text>
        <Text style={styles.subtitle}>
          {hasCommitment
            ? "Your application to become a volunteer wasn't approved. You can keep contributing as normal — nothing about your account has changed."
            : "Your volunteer application wasn't approved this time. You can still support Kiranam by contributing directly."}
        </Text>

        {!!reason && (
          <View style={styles.reasonCard}>
            <Text style={styles.reasonLabel}>Note from the admin</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={hasCommitment ? 'Continue to Home' : 'Become a Contributor Instead'}
            onPress={handleContinue}
            loading={continuing}
          />
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
    marginBottom: 20,
    maxWidth: 290,
  },
  reasonCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  reasonLabel: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    fontSize: 11.5,
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    marginBottom: 6,
  },
  reasonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: '#4A4642',
  },
  buttonContainer: {
    width: '100%',
  },
});
