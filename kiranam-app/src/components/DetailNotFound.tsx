import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';

interface DetailNotFoundProps {
  title: string;
  message: string;
  loading?: boolean;
}

// Shown by the campaign / event detail screens when the id they were opened
// with doesn't match anything (stale deep link, deleted item) so they never
// fall back to showing — or letting someone donate to — a different item.
export function DetailNotFound({ title, message, loading }: DetailNotFoundProps) {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity
        style={styles.backButton}
        onPress={goBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <ArrowLeft size={20} color="#0C0C0D" />
      </TouchableOpacity>
      {!loading && (
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button title="Go back" onPress={goBack} style={styles.button} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF0F1' },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    marginTop: 12,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 22,
    color: '#7A756E',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: { alignSelf: 'stretch' },
});
