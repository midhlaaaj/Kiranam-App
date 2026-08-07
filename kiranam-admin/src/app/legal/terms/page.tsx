import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Kiranam",
  description: "The terms that govern your use of the Kiranam app.",
};

const LAST_UPDATED = "July 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-kiranam-ink">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-kiranam-ink/50">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-8 text-[15px] leading-7 text-kiranam-ink/80">
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
          material changes to these terms, we&apos;ll update the &quot;Last
          updated&quot; date above and, where appropriate, notify you in the app.
        </Section>

        <Section title="9. Disclaimer">
          The app is provided &quot;as is.&quot; While we work to keep it accurate
          and available, we don&apos;t guarantee it will always be error-free or
          uninterrupted.
        </Section>

        <Section title="10. Contact us">
          Questions about these terms? Reach us at{" "}
          <a href="mailto:support@kiranam.org" className="underline">
            support@kiranam.org
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
