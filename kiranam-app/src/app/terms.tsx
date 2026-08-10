import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LAST_UPDATED = 'July 2026';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0C0C0D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms &amp; Conditions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Acceptance of these terms">
          By creating an account or using the Kiranam app, you agree to these
          terms. If you don&apos;t agree, please don&apos;t use the app.
        </Section>

        <Section title="2. Who can use the app">
          You must be at least 18 years old and able to enter into a binding
          agreement to create a contributor or volunteer account.
        </Section>

        <Section title="3. Your account">
          You&apos;re responsible for keeping your phone number and account secure.
          Let us know right away if you believe your account has been accessed
          without your permission. You can delete your account at any time from
          Profile → Delete Account.
        </Section>

        <Section title="4. Contributions">
          Contributions you make through the app are processed by our payment
          partner, Razorpay. Contributions are voluntary and, except where
          required by law or in case of a processing error, are non-refundable
          once completed. You&apos;re responsible for entering accurate payment
          information.
        </Section>

        <Section title="5. WhatsApp reminders">
          If you opt in during sign-up, we&apos;ll send contribution reminders and
          related updates to your phone number over WhatsApp. You can withdraw
          this consent at any time from your profile settings; doing so stops
          future reminder messages but doesn&apos;t affect your account or past
          contributions.
        </Section>

        <Section title="6. Volunteering">
          If you apply to volunteer, we may review your application and assign
          you contributors to support. Volunteering is unpaid and voluntary, and
          either you or Kiranam may end the arrangement at any time.
        </Section>

        <Section title="7. Acceptable use">
          Don&apos;t use the app to impersonate someone else, submit false
          information, interfere with the app&apos;s operation, or use it for any
          unlawful purpose.
        </Section>

        <Section title="8. Changes to the app or these terms">
          We may update the app or these terms from time to time. If we make
          material changes to these terms, we&apos;ll update the &quot;Last updated&quot; date
          above and, where appropriate, notify you in the app.
        </Section>

        <Section title="9. Disclaimer">
          The app is provided &quot;as is.&quot; While we work to keep it accurate and
          available, we don&apos;t guarantee it will always be error-free or
          uninterrupted.
        </Section>

        <Section title="10. Contact us">
          Questions about these terms? Reach us at support@kiranam.online.
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
