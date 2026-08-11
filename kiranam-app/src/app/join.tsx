import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { stashPendingReferralCode, normalizeReferralCode, clearPendingReferralCode } from '@/utils/referral';

// Landing spot for kiranamapp://join?ref=CODE — opened directly once the
// app is installed (tapped from a referral share link, or forwarded here
// by the kiranam.online/join web page's app-scheme redirect). The code
// must be captured the instant this screen sees it, not left waiting on
// someone to notice and retype it on the register screen.
export default function JoinScreen() {
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      if (typeof ref === 'string' && ref) {
        await stashPendingReferralCode(ref);

        // Already signed in (e.g. an existing contributor tapping a
        // friend's link) — redeem right now rather than stashing it for a
        // signup that's never going to happen.
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data } = await supabase.rpc('redeem_referral_code', { code: normalizeReferralCode(ref) });
          if (data) await clearPendingReferralCode();
        }
      }
      // index.tsx already knows how to route a signed-in user to the right
      // place (home / dashboard / pending) or a signed-out one to /login.
      router.replace('/');
    })();
  }, [ref, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#EC2028" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
