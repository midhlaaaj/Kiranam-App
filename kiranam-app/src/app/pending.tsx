import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function PendingScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [notYetApproved, setNotYetApproved] = useState(false);

  const handleContinue = async () => {
    setChecking(true);
    setNotYetApproved(false);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    const { data: application } = uid
      ? await supabase
          .from('volunteer_applications')
          .select('status')
          .eq('profile_id', uid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };
    setChecking(false);

    if (application?.status === 'approved') {
      router.replace('/(volunteer-tabs)/dashboard');
    } else {
      setNotYetApproved(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {/* Pending review circular icon indicator */}
        <View style={styles.iconOuterRing}>
          <View style={styles.iconInnerRing}>
            <Clock size={28} color="#EC2028" strokeWidth={2} />
          </View>
        </View>

        {/* Messaging */}
        <Text style={styles.title}>Your application is under review</Text>
        <Text style={styles.subtitle}>
          We&apos;ll notify you once an admin approves your volunteer account — this usually takes a few days.
        </Text>

        {notYetApproved && (
          <Text style={styles.notApprovedText}>Still under review — check back soon.</Text>
        )}

        {/* Back Link */}
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.7}
          disabled={checking}
        >
          <Text style={styles.backLink}>Continue</Text>
        </TouchableOpacity>
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
  },
  iconOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FBEAEA',
    borderTopColor: '#EC2028', // Simulated 25% conic/circular progress
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
    // Subtle shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 23,
    color: '#0C0C0D',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 280,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 24,
    color: '#7A756E',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 290,
  },
  notApprovedText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#BA1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  backLink: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#0C0C0D',
    textDecorationLine: 'underline',
  },
});
