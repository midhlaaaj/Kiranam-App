import React from 'react';
import { Text, StyleSheet, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';

// Content to be supplied — add { title, body } entries here.
const SECTIONS: { title: string; body: string }[] = [];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="About Kiranam" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {SECTIONS.length === 0 ? (
          <Text style={styles.sectionBody}>More about Kiranam is coming soon.</Text>
        ) : (
          SECTIONS.map((s) => (
            <View key={s.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF0F1' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 15,
    color: '#0C0C0D',
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: '#4A4642',
  },
});
