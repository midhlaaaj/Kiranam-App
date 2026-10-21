import React from 'react';
import { Text, StyleSheet, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { HcfMark } from '@/components/HcfMark';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'One Day. One Rupee.',
    body:
      'Karunya Kiranam is the micro-fundraising initiative of Health Care Foundation (HCF), launched in 2024 to build a compassionate community committed to the empowerment and inclusion of persons with disabilities.\n\nThe idea is simple yet powerful: a contribution of just ₹1 a day can create meaningful change when thousands of people come together. With a minimum of ₹30 a month, you become part of a collective movement for the welfare, dignity, independence and social inclusion of persons with disabilities.',
  },
  {
    title: 'Give in the way that suits you',
    body:
      'Contribute directly or online. Choose to support for one year, become a lifetime contributor, or make a one-time contribution. Every contribution, whatever its size or frequency, is a commitment to a more inclusive society.',
  },
  {
    title: 'How your contribution is used',
    body:
      'Funds raised through Karunya Kiranam support the programmes run by Health Care Foundation for the empowerment of persons with disabilities. These include education, rehabilitation, therapy, skill development, vocational training, independent living, care and support services, and other approved welfare activities.\n\nBy bringing small contributions together, Karunya Kiranam helps HCF create opportunities, improve quality of life, promote self-reliance, and uphold the dignity and rights of persons with disabilities.',
  },
  {
    title: 'Be a Kiranam. Spread the light.',
    body:
      'Every contributor is a Kiranam, a small ray of light in a greater cause. Dedicated volunteers serve as Kiran Coordinators: they connect with people, introduce new contributors to the initiative, and encourage continued participation.',
  },
  {
    title: 'Kiranam Day',
    body:
      'The 3rd of every month is Kiranam Day, set aside for awareness, outreach, community engagement, and welcoming new Kiranams into the movement.',
  },
  {
    title: 'A growing community',
    body:
      'Since 2024, Karunya Kiranam has grown into a community of thousands of contributors, showing how collective generosity can advance a shared social mission.',
  },
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="About Kiranam" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <HcfMark size={72} color="#EC2028" />
          <Text style={styles.heroTitle}>Karunya Kiranam</Text>
          <Text style={styles.heroTagline}>Empowering lives, inspiring smiles</Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.closing}>
          <Text style={styles.closingLine}>
            Every rupee matters. Every Kiranam counts. Every act of kindness brings us closer to a society where
            persons with disabilities live with dignity, opportunity and inclusion.
          </Text>
          <Text style={styles.closingCta}>Join Karunya Kiranam. Become a ray of hope.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF0F1' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroTitle: {
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    fontSize: 24,
    color: '#0C0C0D',
    letterSpacing: -0.4,
    marginTop: 16,
  },
  heroTagline: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#7A756E',
    marginTop: 4,
  },
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
  closing: {
    marginTop: 4,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  closingLine: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: '#4A4642',
  },
  closingCta: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 21,
    color: '#EC2028',
    marginTop: 10,
  },
});
