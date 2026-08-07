import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Kiranam",
  description: "How Kiranam collects, uses, and protects your information.",
};

const LAST_UPDATED = "July 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-kiranam-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-kiranam-ink/50">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-8 text-[15px] leading-7 text-kiranam-ink/80">
        <Section title="1. Who we are">
          Kiranam (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Kiranam app to
          connect contributors and volunteers with our charitable work. This policy
          explains what information we collect through the app, why we collect it,
          and how you can control it.
        </Section>

        <Section title="2. Information we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Account details: your full name, phone number, and email address (if
              you provide one).
            </li>
            <li>
              Contribution details: amounts, dates, and campaigns you contribute to,
              processed through our payment partner Razorpay. We do not store your
              card, UPI, or bank details — Razorpay handles and secures that
              information directly.
            </li>
            <li>
              Volunteer details: if you apply to volunteer, the information you
              submit in that application (e.g. your motivation, availability).
            </li>
            <li>
              Communication preferences: whether you&apos;ve agreed to receive
              contribution reminders over WhatsApp.
            </li>
          </ul>
        </Section>

        <Section title="3. How we use your information">
          We use your information to create and manage your account, process and
          record contributions, connect volunteers with contributors, send
          contribution reminders and updates (via WhatsApp or in-app notifications,
          only where you&apos;ve agreed to this), and to communicate with you about
          your account or our work.
        </Section>

        <Section title="4. Who we share it with">
          We share the minimum necessary information with the service providers
          that make the app work: Supabase (our database and authentication
          provider), Razorpay (payment processing), and Meta&apos;s WhatsApp
          Business Platform (for WhatsApp reminders, only if you&apos;ve opted in).
          We do not sell your personal information to anyone.
        </Section>

        <Section title="5. Your rights">
          You can review and update your profile information at any time from
          within the app. You can also permanently delete your account and
          associated data from Profile → Delete Account — this removes your account
          and personal information from our systems, other than records we&apos;re
          legally required to retain (such as financial contribution records for
          accounting/tax purposes).
        </Section>

        <Section title="6. Data retention">
          We keep your information for as long as your account is active. If you
          delete your account, we remove your personal profile data promptly, while
          retaining anonymized contribution records where required by applicable
          financial regulations.
        </Section>

        <Section title="7. Children's privacy">
          This app is not directed at children under 18. We do not knowingly
          collect information from anyone under 18.
        </Section>

        <Section title="8. Changes to this policy">
          If we make material changes to this policy, we&apos;ll update the
          &quot;Last updated&quot; date above and, where appropriate, notify you in
          the app.
        </Section>

        <Section title="9. Contact us">
          If you have questions about this policy or your data, contact us at{" "}
          <a href="mailto:privacy@kiranam.org" className="underline">
            privacy@kiranam.org
          </a>
          .
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-kiranam-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
