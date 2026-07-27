-- Consent tracking for kiranam-app's registration screen: a required
-- checkbox agreeing to Terms & Conditions + Privacy Policy, and an
-- opt-in for WhatsApp contribution reminders.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
