import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LAST_UPDATED = 'July 2026';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Who we are">
          Kiranam ("we", "us", "our") operates this app to connect contributors and
          volunteers with our charitable work. This policy explains what information
          we collect through the app, why we collect it, and how you can control it.
        </Section>

        <Section title="2. Information we collect">
          {'•'} Account details: your full name, phone number, and email address (if
          you provide one).{'\n\n'}
          {'•'} Contribution details: amounts, dates, and campaigns you contribute
          to, processed through our payment partner Razorpay. We do not store your
          card, UPI, or bank details — Razorpay handles and secures that
          information directly.{'\n\n'}
          {'•'} Volunteer details: if you apply to volunteer, the information you
          submit in that application (e.g. your motivation, availability).{'\n\n'}
          {'•'} Communication preferences: whether you've agreed to receive
          contribution reminders over WhatsApp.
        </Section>

        <Section title="3. How we use your information">
          We use your information to create and manage your account, process and
          record contributions, connect volunteers with contributors, send
          contribution reminders and updates (via WhatsApp or in-app notifications,
          only where you've agreed to this), and to communicate with you about your
          account or our work.
        </Section>

        <Section title="4. Who we share it with">
          We share the minimum necessary information with the service providers
          that make the app work: Supabase (our database and authentication
          provider), Razorpay (payment processing), and Meta's WhatsApp Business
          Platform (for WhatsApp reminders, only if you've opted in). We do not
          sell your personal information to anyone.
        </Section>

        <Section title="5. Your rights">
          You can review and update your profile information at any time from
          within the app. You can also permanently delete your account and
          associated data from Profile → Delete Account — this removes your
          account and personal information from our systems, other than records
          we're legally required to retain (such as financial contribution
          records for accounting/tax purposes).
        </Section>

        <Section title="6. Data retention">
          We keep your information for as long as your account is active. If you
          delete your account, we remove your personal profile data promptly,
          while retaining anonymized contribution records where required by
          applicable financial regulations.
        </Section>

        <Section title="7. Children's privacy">
          This app is not directed at children under 18. We do not knowingly
          collect information from anyone under 18.
        </Section>

        <Section title="8. Changes to this policy">
          If we make material changes to this policy, we'll update the "Last
          updated" date above and, where appropriate, notify you in the app.
        </Section>

        <Section title="9. Contact us">
          If you have questions about this policy or your data, contact us at
          privacy@kiranam.org.
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F8F6',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 20,
    color: '#0C0C0D',
    letterSpacing: -0.4,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  updated: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#B0ADA8',
    marginBottom: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontFamily: 'Inter',
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
