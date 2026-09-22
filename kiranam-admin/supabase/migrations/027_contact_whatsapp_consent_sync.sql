-- ============================================================
-- 027_contact_whatsapp_consent_sync.sql
--
-- Closes a gap found in a security audit: contributors/volunteers who
-- unchecked "I'd like to receive contribution reminders over WhatsApp"
-- at registration (profiles.whatsapp_consent = false, migration
-- 007_consent_tracking.sql) were still synced into wacrm's `contacts`
-- table and tagged Contributor/Volunteer by
-- sync_profile_to_wacrm_contact() (20260724000001), making them
-- targetable by broadcasts regardless of that choice. The privacy
-- policy promises WhatsApp reminders only go out "where you've given
-- specific consent" — nothing enforced that for broadcasts.
--
-- This adds contacts.whatsapp_consent, keeps it in sync with the
-- source profiles row (including on later opt-out via the app), and
-- backfills existing synced contacts. Broadcast audience resolution
-- (use-broadcast-sending.ts) filters on this column. Contacts with no
-- kiranam_profile_id (CSV-imported / manually added in the CRM) are
-- unaffected — they were never gated by this checkbox to begin with.
-- ============================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS whatsapp_consent boolean NOT NULL DEFAULT true;

-- Backfill from the linked profile.
UPDATE public.contacts c
SET whatsapp_consent = p.whatsapp_consent
FROM public.profiles p
WHERE c.kiranam_profile_id = p.id
  AND c.whatsapp_consent IS DISTINCT FROM p.whatsapp_consent;

CREATE OR REPLACE FUNCTION public.sync_profile_to_wacrm_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_contact_id uuid;
  v_tag_name text;
  v_tag_id uuid;
BEGIN
  IF NEW.role NOT IN ('contributor', 'volunteer') THEN
    RETURN NEW;
  END IF;
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_account_id FROM public.accounts WHERE name = 'Kiranam' LIMIT 1;
  IF v_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.contacts (account_id, user_id, phone, name, kiranam_profile_id, whatsapp_consent)
  VALUES (v_account_id, NEW.id, NEW.phone, COALESCE(NULLIF(NEW.full_name, ''), NEW.phone), NEW.id, NEW.whatsapp_consent)
  ON CONFLICT (kiranam_profile_id) WHERE kiranam_profile_id IS NOT NULL
  DO UPDATE SET phone = EXCLUDED.phone, name = EXCLUDED.name, whatsapp_consent = EXCLUDED.whatsapp_consent
  RETURNING id INTO v_contact_id;

  v_tag_name := CASE NEW.role WHEN 'contributor' THEN 'Contributor' ELSE 'Volunteer' END;

  SELECT id INTO v_tag_id FROM public.tags WHERE account_id = v_account_id AND name = v_tag_name;
  IF v_tag_id IS NULL THEN
    INSERT INTO public.tags (account_id, user_id, name)
    VALUES (v_account_id, NEW.id, v_tag_name)
    RETURNING id INTO v_tag_id;
  END IF;

  IF v_tag_id IS NOT NULL AND v_contact_id IS NOT NULL THEN
    INSERT INTO public.contact_tags (contact_id, tag_id)
    VALUES (v_contact_id, v_tag_id)
    ON CONFLICT (contact_id, tag_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to sync profile % to wacrm contact: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Now also fires when whatsapp_consent changes (e.g. withdrawn later
-- from the app), in addition to the original full_name/phone/role set.
DROP TRIGGER IF EXISTS on_profile_sync_wacrm_contact ON public.profiles;
CREATE TRIGGER on_profile_sync_wacrm_contact
  AFTER INSERT OR UPDATE OF full_name, phone, role, whatsapp_consent ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_wacrm_contact();
