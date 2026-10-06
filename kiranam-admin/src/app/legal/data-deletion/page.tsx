import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion — Kiranam",
  description: "How to request deletion of your Kiranam data, including data collected via WhatsApp.",
};

const LAST_UPDATED = "October 6, 2026";

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-kiranam-ink">Data Deletion Instructions</h1>
      <p className="mt-2 text-sm text-kiranam-ink/50">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-8 text-[15px] leading-7 text-kiranam-ink/80">
        <Section title="1. If you have a Kiranam app account">
          You can permanently delete your account and associated data yourself, at
          any time, from within the app: open <strong>Profile → Delete Account</strong>
          {" "}and confirm. This immediately and irreversibly deletes your profile,
          contribution and volunteer records, assignments, referrals, and
          notifications, subject only to the limited financial-record retention
          described in our{" "}
          <a href="/legal/privacy" className="underline">
            Privacy Policy
          </a>{" "}
          (accounting and tax law require us to keep contribution/payment records
          for a period even after account deletion). No separate request is needed
          — the in-app action is immediate and self-service.
        </Section>

        <Section title="2. If you've only messaged us on WhatsApp">
          If you&apos;ve messaged Kiranam&apos;s WhatsApp number but never created an
          app account, we hold your phone number, name (if shared), and message
          history in our WhatsApp communications system. To request deletion of
          this data:
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              Email{" "}
              <a href="mailto:support@kiranam.online" className="underline">
                support@kiranam.online
              </a>{" "}
              from the email address you want us to reply to, with the phone
              number you messaged us from and the subject line &quot;Delete my
              WhatsApp data&quot;, or
            </li>
            <li>Send us a WhatsApp message saying &quot;delete my data&quot;.</li>
          </ul>
          We&apos;ll verify the request is coming from that phone number, then
          delete your conversation history, contact record, and any tags or notes
          associated with it within 30 days, and confirm once it&apos;s done.
        </Section>

        <Section title="3. What gets deleted">
          Deletion removes your profile/contact information, message and
          conversation history, volunteer or contribution records tied to your
          account, and consent/preference records. It does not remove information
          we&apos;re legally required to retain (e.g. financial records for tax and
          accounting purposes, as described in our Privacy Policy §6), or
          information already shared with a third-party processor (Razorpay for
          payments, Meta for WhatsApp delivery) under their own retention rules.
        </Section>

        <Section title="4. Questions or a grievance">
          If you&apos;re not satisfied with how a deletion request was handled, you
          can reach our Grievance Officer using the contact details in our{" "}
          <a href="/legal/privacy" className="underline">
            Privacy Policy
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
