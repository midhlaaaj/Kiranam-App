-- ============================================================
-- 043_consent_on_phone_verify.sql
--
-- Login codes are delivered on WhatsApp, so verifying the code is
-- treated as consent to WhatsApp messages. When an account's phone is
-- first confirmed, profiles.whatsapp_consent is set to true (which also
-- syncs to the linked WhatsApp contact via the existing profile trigger).
--
-- Only the *first* confirmation counts: a later opt-out in the app is
-- not undone by logging in again.
-- ============================================================

CREATE OR REPLACE FUNCTION public.consent_whatsapp_on_phone_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_confirmed_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.phone_confirmed_at IS NULL) THEN
    UPDATE public.profiles
    SET whatsapp_consent = true
    WHERE id = NEW.id AND whatsapp_consent = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_phone_confirmed ON auth.users;
CREATE TRIGGER on_auth_phone_confirmed
  AFTER INSERT OR UPDATE OF phone_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.consent_whatsapp_on_phone_confirm();

-- Backfill: accounts that verified their phone but never finished registering
-- (no name yet) — the people left without consent. Accounts that registered and
-- chose not to consent are deliberately left alone.
UPDATE public.profiles p
SET whatsapp_consent = true
FROM auth.users u
WHERE u.id = p.id
  AND u.phone_confirmed_at IS NOT NULL
  AND p.whatsapp_consent = false
  AND p.role IN ('contributor', 'coordinator')
  AND COALESCE(p.full_name, '') = '';
