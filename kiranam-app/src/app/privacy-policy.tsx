import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LAST_UPDATED = 'August 11, 2026';

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

        <Section title="1. Introduction">
          This Privacy Policy explains how Kiranam (&quot;Kiranam&quot;, &quot;we&quot;,
          &quot;us&quot;, &quot;our&quot;) — operated by Health Care Foundation,
          having its registered office at P.O. Kattippara, Poonoor, Kozhikode, Kerala 673573, India — collects, uses,
          discloses, stores, and protects personal information when you use the
          Kiranam mobile application and related services (the &quot;Services&quot;).
          This Policy is published in line with the Digital Personal Data
          Protection Act, 2023 (&quot;DPDP Act&quot;) and the Information Technology
          Act, 2000, to the extent applicable. By creating an account or using the
          Services, you agree to the collection and use of information as
          described here. If you don&apos;t agree, please don&apos;t use the
          Services.
        </Section>

        <Section title="2. Information we collect">
          {'Information you give us directly:'}
          {'\n'}
          {'•'} Account details: your full name, phone number, email address,
          password (stored as a salted hash — we never store it in plain text),
          and an optional profile photo.{'\n\n'}
          {'•'} Volunteer application details: your motivation, availability,
          skills, and anything else you submit in that application.{'\n\n'}
          {'•'} Your communication preferences and consent choices (e.g. WhatsApp
          reminders, push notifications).{'\n\n'}
          {'Information generated as you use the app:'}
          {'\n'}
          {'•'} Contribution details: amount, date, campaign, and status of each
          contribution, processed through our payment partner Razorpay Software
          Private Limited. We do not collect or store your card number, CVV, UPI
          PIN, or net-banking credentials — Razorpay collects and secures that
          information directly under its own privacy and security policies.{'\n\n'}
          {'•'} Volunteer activity records: contributor assignments and status
          updates recorded within the app.{'\n\n'}
          {'•'} Device and technical information: device model, OS version, app
          version, unique installation identifiers, IP address, and crash or
          performance diagnostics.{'\n\n'}
          {'•'} A push-notification device token (via Firebase Cloud Messaging and
          Expo&apos;s push service) so we can deliver notifications you haven&apos;t
          opted out of.{'\n\n'}
          {'What we don’t collect:'}
          {'\n'}
          {'•'} We don&apos;t access your contacts, photos (other than a profile
          picture you choose to upload), files, or messages, and we don&apos;t use
          third-party advertising or tracking SDKs.
        </Section>

        <Section title="3. How we use your information">
          We use your information to: create and manage your account; process and
          record contributions and issue receipts/acknowledgements; match and
          coordinate volunteers with contributors; send transactional messages
          needed to run the app (e.g. OTPs, payment confirmations); send
          contribution reminders and programme updates via WhatsApp or
          push/in-app notification, only where you&apos;ve given specific consent,
          which you can withdraw at any time; detect and prevent fraud, abuse, and
          security incidents; and comply with applicable law.
        </Section>

        <Section title="4. Who we share it with">
          We do not sell, rent, or trade your personal data. We share the minimum
          necessary information with:{'\n\n'}
          {'•'} Supabase, Inc. — our database, authentication, and file storage
          provider.{'\n\n'}
          {'•'} Razorpay Software Private Limited — payment processing for
          contributions.{'\n\n'}
          {'•'} Meta Platforms, Inc. (WhatsApp Business Platform) — WhatsApp
          reminders, only if you&apos;ve opted in.{'\n\n'}
          {'•'} Google LLC (Firebase Cloud Messaging) and Expo — delivery of push
          notifications.{'\n\n'}
          {'•'} Volunteers and administrators, on a need-to-know basis, where
          necessary to coordinate a volunteer-contributor relationship.{'\n\n'}
          We may also disclose information where required by law, court order, or
          governmental request, or to protect the rights, property, or safety of
          Kiranam, our users, or the public — and as part of any merger,
          acquisition, or sale of assets, subject to this Policy or one at least
          as protective.
        </Section>

        <Section title="5. Cross-border data transfer">
          Some of our service providers (e.g. Supabase, Meta, Google) may process
          or store data outside India. Where personal data is transferred outside
          India, we take reasonable steps to keep it protected consistent with the
          DPDP Act and this Policy.
        </Section>

        <Section title="6. Data retention">
          We keep account and profile data for as long as your account is active,
          plus a reasonable period after deletion to prevent fraud and resolve
          disputes. Contribution and financial records are retained for the
          period required under applicable accounting and tax regulations
          (typically up to 8 years), even after account deletion, because
          we&apos;re legally required to keep them. Volunteer application data is
          kept for the duration of your volunteering relationship and a
          reasonable period after. When data is no longer needed, we securely
          delete, anonymize, or aggregate it.
        </Section>

        <Section title="7. Data security">
          We use reasonable technical and organizational safeguards appropriate to
          the sensitivity of the data we process, including encryption in transit
          (TLS), salted-hash password storage, role-based access controls, and
          row-level security on our database. No method of transmission or storage
          is 100% secure, and we can&apos;t guarantee absolute security. If we
          become aware of a personal data breach likely to affect you, we&apos;ll
          notify you and the relevant authorities as required by law.
        </Section>

        <Section title="8. Your rights">
          Subject to applicable law, including the DPDP Act, you can: review and
          correct your profile information at any time from within the app;
          withdraw consent for anything consent-based (e.g. WhatsApp reminders,
          push notifications) at any time, without affecting processing that
          already happened; permanently delete your account and associated data
          from Profile → Delete Account, subject to the retention we describe in
          Section 6; and nominate another individual to exercise these rights on
          your behalf in the event of your death or incapacity — contact us to
          register a nominee. See Section 11 for how to raise a grievance.
        </Section>

        <Section title="9. Children's privacy">
          The Services are not directed at, and may not be used by, anyone under
          18. We do not knowingly collect personal data from anyone under 18. If
          we learn we&apos;ve inadvertently collected data from a child, we&apos;ll
          delete it promptly — contact us if you believe this has happened.
        </Section>

        <Section title="10. Third-party links and services">
          The Services link to or integrate with third parties such as UPI
          payment apps and WhatsApp. This Policy doesn&apos;t apply to, and
          we&apos;re not responsible for, their privacy practices — please review
          their own policies.
        </Section>

        <Section title="11. Grievance redressal">
          In accordance with the DPDP Act, 2023 and the Information Technology
          Act, 2000, we&apos;ve appointed a Grievance Officer for concerns about
          this Policy or our handling of your personal data:{'\n\n'}
          Grievance Officer: [grievance officer name]{'\n'}
          Email: privacy@kiranam.online{'\n'}
          Address: P.O. Kattippara, Poonoor, Kozhikode, Kerala 673573, India{'\n\n'}
          We&apos;ll acknowledge your grievance and aim to resolve it within the
          timelines prescribed by applicable law. If you&apos;re not satisfied
          with our response, you may approach the Data Protection Board of India
          or other competent authority.
        </Section>

        <Section title="12. Changes to this policy">
          If we make material changes to this policy, we&apos;ll update the &quot;Last
          updated&quot; date above and, where appropriate, notify you in the app or
          by email before the changes take effect.
        </Section>

        <Section title="13. Contact us">
          If you have questions about this policy or your data, contact us at
          privacy@kiranam.online or at P.O. Kattippara, Poonoor, Kozhikode, Kerala 673573, India.
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
    fontFamily: 'Inter-Bold',
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
