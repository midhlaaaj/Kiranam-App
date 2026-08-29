import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LAST_UPDATED = 'August 11, 2026';

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
          These Terms &amp; Conditions (&quot;Terms&quot;) are a legally binding
          agreement between you and Kiranam — operated by Health Care
          Foundation (&quot;Kiranam&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) —
          governing your access to and use of the Kiranam app and related services
          (the &quot;Services&quot;). By creating an account or using the Services,
          you confirm that you&apos;ve read, understood, and agree to these Terms
          and our Privacy Policy, which is incorporated by reference. If you
          don&apos;t agree, please don&apos;t use the Services.
        </Section>

        <Section title="2. Who can use the app">
          You must be at least 18 years old and capable of entering into a
          legally binding contract under the Indian Contract Act, 1872, to create
          a contributor or volunteer account. We may request proof of age or
          identity and may suspend or terminate accounts that don&apos;t meet
          these requirements.
        </Section>

        <Section title="3. What Kiranam is">
          Kiranam is a platform that lets contributors make voluntary financial
          contributions toward charitable causes and campaigns we facilitate, and
          lets volunteers apply for and take part in volunteer activities we
          coordinate. Kiranam is not a bank, payment aggregator, or financial
          institution — all payment processing is carried out by our licensed
          payment partner, Razorpay.
        </Section>

        <Section title="4. Your account">
          You must provide accurate, current, and complete information when
          creating your account and keep it up to date. You&apos;re responsible
          for keeping your account credentials secure and for all activity under
          your account. Let us know right away at support@kiranam.online if you
          believe your account has been accessed without your permission. We may
          suspend or terminate accounts that contain false, misleading, or
          fraudulent information. You can delete your account at any time from
          Profile → Delete Account, subject to the data-retention terms in our
          Privacy Policy.
        </Section>

        <Section title="5. Contributions">
          Contributions you make through the app are voluntary and, except where
          required by law or in case of a processing error, are non-refundable
          once completed. If you believe a contribution was made in error or
          processed incorrectly, contact us within 7 days at
          support@kiranam.online and we&apos;ll investigate in good faith.
          Contributions are processed by Razorpay, and by contributing you also
          agree to Razorpay&apos;s terms and privacy policy for that transaction.
          You&apos;re solely responsible for the accuracy of the payment
          information you provide and for any charges or fees your bank or card
          issuer applies. Nothing in the Services is financial, tax, or
          investment advice. [If Kiranam holds 80G/12A registration under the
          Income Tax Act, 1961, tax-deduction language and registration numbers
          should be added here.]
        </Section>

        <Section title="6. Volunteering">
          If you apply to volunteer, we may review and verify your application
          and, at our discretion, assign you to support one or more contributors
          or campaigns. Volunteering is unpaid and entirely voluntary, and
          nothing in these Terms creates an employment, agency, or partnership
          relationship between you and Kiranam. You agree to treat contributors
          and other users you interact with respectfully and in line with any
          volunteer conduct guidelines we communicate to you. Either you or
          Kiranam may end a volunteering arrangement, with or without cause, at
          any time.
        </Section>

        <Section title="7. Communications and consent">
          If you opt in during sign-up or from your profile settings, we&apos;ll
          send contribution reminders and related updates to you over WhatsApp
          and/or push or in-app notification. You can withdraw this consent at
          any time from your profile settings; doing so stops future reminder
          messages but doesn&apos;t affect your account, past contributions, or
          transactional messages needed to run the app (e.g. OTPs, payment
          confirmations). Your carrier&apos;s message and data rates may apply to
          WhatsApp messages.
        </Section>

        <Section title="8. Acceptable use">
          You agree not to: impersonate any person or entity, or misrepresent
          your affiliation with one; submit false, misleading, or fraudulent
          information, including in a contribution or volunteer application; use
          the Services for money laundering, terror financing, or any unlawful
          purpose; interfere with or attempt unauthorized access to the Services
          or other users&apos; accounts; reverse-engineer, decompile, or scrape
          the Services except as permitted by law; upload viruses or other
          harmful code; or otherwise use the Services in violation of applicable
          law. We may investigate suspected violations, suspend or terminate
          accounts, and report unlawful activity to law enforcement without prior
          notice.
        </Section>

        <Section title="9. Intellectual property">
          The Services — including software, text, graphics, and logos (excluding
          content you submit) — are owned by or licensed to Kiranam and protected
          by applicable intellectual property law. We grant you a limited,
          non-exclusive, non-transferable, revocable licence to use the Services
          for their intended purpose. You may not copy, modify, distribute, sell,
          or lease any part of the Services without our prior written consent.
        </Section>

        <Section title="10. Third-party services">
          The Services integrate with or link to third parties, including
          Razorpay, UPI payment apps, WhatsApp (Meta Platforms, Inc.), and
          Supabase. Your use of those services is governed by their own terms and
          privacy policies, and Kiranam isn&apos;t responsible for their acts,
          omissions, availability, or content.
        </Section>

        <Section title="11. Disclaimer">
          The Services are provided &quot;as is&quot; and &quot;as available,&quot;
          without warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, or that the
          Services will be uninterrupted, timely, secure, or error-free. We
          don&apos;t guarantee the accuracy or completeness of content within the
          Services, including campaign information submitted by volunteers or
          administrators.
        </Section>

        <Section title="12. Limitation of liability">
          To the maximum extent permitted by applicable law, Kiranam and its
          officers, employees, and agents won&apos;t be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of
          profits, data, or goodwill, arising from your use of the Services. Our
          total liability for any claim relating to these Terms or the Services
          won&apos;t exceed the greater of (a) the total amount you contributed
          through the Services in the 12 months before the claim, or (b) ₹5,000.
          Nothing here excludes or limits liability that can&apos;t be excluded
          or limited under applicable law, including for fraud or wilful
          misconduct.
        </Section>

        <Section title="13. Indemnification">
          You agree to indemnify and hold harmless Kiranam, its officers,
          employees, volunteers, and agents from claims, liabilities, damages,
          losses, and expenses (including reasonable legal fees) arising from (a)
          your access to or use of the Services, (b) your violation of these
          Terms, or (c) your violation of any third party&apos;s rights,
          including intellectual property or privacy rights.
        </Section>

        <Section title="14. Suspension and termination">
          We may suspend or terminate your access to the Services, with or
          without notice, if we reasonably believe you&apos;ve violated these
          Terms or engaged in fraudulent or unlawful activity, or if required to
          by law. You may stop using the Services and delete your account at any
          time. Provisions that by their nature should survive termination
          (including Sections 9, 11, 12, 13, and 16) will continue to apply.
        </Section>

        <Section title="15. Force majeure">
          Kiranam isn&apos;t liable for any failure or delay in performance
          caused by events beyond our reasonable control, including acts of God,
          natural disasters, war, riots, labour disputes, internet or
          telecommunications failures, or failures of third-party providers such
          as Razorpay, Supabase, or Meta.
        </Section>

        <Section title="16. Governing law and disputes">
          These Terms are governed by the laws of India, without regard to
          conflict-of-laws principles. Subject to Section 17, the courts at
          Kozhikode, India have exclusive jurisdiction over any dispute arising out
          of or connected with these Terms or the Services.
        </Section>

        <Section title="17. Grievance officer">
          In accordance with the Information Technology Act, 2000 and applicable
          rules, our Grievance Officer can be reached at:{'\n\n'}
          Grievance Officer: [grievance officer name]{'\n'}
          Email: support@kiranam.online{'\n'}
          Address: P.O. Kattippara, Poonoor, Kozhikode, Kerala 673573, India{'\n\n'}
          We&apos;ll acknowledge complaints within 48 hours and aim to resolve
          them within 30 days, or such other period as prescribed by applicable
          law.
        </Section>

        <Section title="18. Changes to the app or these terms">
          We may update the app or these Terms from time to time. If we make
          material changes, we&apos;ll update the &quot;Last updated&quot; date
          above and, where appropriate, notify you in the app before the changes
          take effect. Continuing to use the Services after that means you accept
          the revised Terms. These Terms, with our Privacy Policy, are the entire
          agreement between you and Kiranam about the Services. If any provision
          is held invalid, the rest remain in effect, and our failure to enforce
          a provision isn&apos;t a waiver of it.
        </Section>

        <Section title="19. Contact us">
          Questions about these terms? Reach us at support@kiranam.online or at
          P.O. Kattippara, Poonoor, Kozhikode, Kerala 673573, India.
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
