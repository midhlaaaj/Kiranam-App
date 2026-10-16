import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

const ANDROID_STORE_FALLBACK = 'https://play.google.com/store/apps/details?id=com.kiranam.app';

/** "1.10.0" > "1.9.2" — numeric, segment by segment. */
export function isOlderVersion(current: string, minimum: string): boolean {
  const a = current.split('.').map((n) => parseInt(n, 10) || 0);
  const b = minimum.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

/** Blocks the app with an "Update required" screen when this build is older
 * than app_config.min_app_version — how breaking backend changes (like the
 * Volunteer → Coordinator database rename) can ship without leaving old
 * installs half-working. Fails open: if the check can't run (offline,
 * table missing), the app carries on as normal. */
export function UpdateRequiredGate({ children }: { children: React.ReactNode }) {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const check = useCallback(async () => {
    const current = Constants.expoConfig?.version;
    if (!current) return;
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['min_app_version', 'store_url_android', 'store_url_ios']);
    if (error || !data) return;
    const config = Object.fromEntries(data.map((r) => [r.key, r.value as string | null]));
    const minimum = config.min_app_version;
    setStoreUrl(
      (Platform.OS === 'ios' ? config.store_url_ios : config.store_url_android) ||
        (Platform.OS === 'android' ? ANDROID_STORE_FALLBACK : null),
    );
    setBlocked(!!minimum && isOlderVersion(current, minimum));
  }, []);

  useEffect(() => {
    // Deferred a tick so the first check isn't a synchronous call from the
    // effect body (its setState calls land after the network await anyway).
    const first = setTimeout(check, 0);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearTimeout(first);
      sub.remove();
    };
  }, [check]);

  if (!blocked) return <>{children}</>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Update required</Text>
        <Text style={styles.body}>
          A new version of Karunya Kiranam is available. Please update the app to keep contributing and to see your
          latest activity.
        </Text>
      </View>
      {storeUrl ? <Button title="Update now" onPress={() => Linking.openURL(storeUrl)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 26,
    color: '#0C0C0D',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22,
    color: '#7A756E',
  },
});
