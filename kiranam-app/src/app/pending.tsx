import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { checkFreshRejection, resolvePostAuthRoute } from '@/utils/volunteerRouting';

export default function PendingScreen() {
  const router = useRouter();
  const { signOut, hasCommitment } = useApp();
  const [checking, setChecking] = useState(false);
  const [notYetApproved, setNotYetApproved] = useState(false);

  // This screen is reached via router.replace (see otp.tsx/index.tsx), so
  // there's nothing sensible in the back stack for a hardware/gesture back
  // press to land on — and re-checking status via "Continue" was the only
  // way off this screen otherwise, with no way to actually leave the
  // account if someone landed here by mistake or wants to try a different
  // number. An explicit sign-out is the deliberate way out.
  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  // Contributors who applied via their profile already have a real Home to
  // go back to — no need to make them wait on a status recheck here, since
  // approval gets picked up automatically the next time they open the app
  // (see otp.tsx/index.tsx, both routed through resolvePostAuthRoute). They
  // still get one check first, though: a fresh rejection they haven't seen
  // yet must show /volunteer-rejected rather than silently dropping them
  // straight into Home with no explanation.
  // A fresh volunteer-only applicant has nowhere else to go yet, so for
  // them this button doing a full inline recheck is the only useful action.
  const handleContinue = async () => {
    setChecking(true);
    setNotYetApproved(false);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setChecking(false);
      setNotYetApproved(true);
      return;
    }

    if (hasCommitment) {
      const rejectedRoute = await checkFreshRejection(uid);
      setChecking(false);
      router.replace(rejectedRoute ?? '/(tabs)/home');
      return;
    }

    const dest = await resolvePostAuthRoute(uid);
    setChecking(false);
    if (dest === '/pending') {
      setNotYetApproved(true);
    } else {
      router.replace(dest);
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
          {hasCommitment
            ? "Your interest in becoming a volunteer has been noted — you can check back once approved."
            : "We'll notify you once an admin approves your volunteer account — this usually takes a few days."}
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
          <Text style={styles.backLink}>{hasCommitment ? 'Continue to Home' : 'Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.logoutLink}>
          <Text style={styles.logoutLinkText}>Log out</Text>
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 14,
    color: '#0C0C0D',
    textDecorationLine: 'underline',
  },
  logoutLink: {
    marginTop: 20,
  },
  logoutLinkText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#7A756E',
    textDecorationLine: 'underline',
  },
});
