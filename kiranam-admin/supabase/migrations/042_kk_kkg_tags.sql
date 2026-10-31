-- ============================================================
-- 042_kk_kkg_tags.sql
--
-- Adds "KK" and "KKG" contact tags so broadcasts can be filtered by
-- KK series (Broadcast → Select Audience → Filter by Tags).
--
-- The series comes from profiles.kk_number: "KKG…" → KKG, any other
-- "KK…" → KK. A profile with no KK number gets neither. The tag follows
-- the number — when kk_number changes, the old series tag is removed and
-- the new one added. Existing contacts are backfilled below.
-- ============================================================

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
  v_kk_name text;
  v_kk_tag_id uuid;
  v_name text;
BEGIN
  IF NEW.role NOT IN ('contributor', 'coordinator') THEN
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

  v_tag_name := CASE NEW.role WHEN 'contributor' THEN 'Contributor' ELSE 'Coordinator' END;

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

  -- KK / KKG series tag: drop whichever of the two no longer applies, add the right one.
  IF v_contact_id IS NOT NULL THEN
    v_kk_name := CASE
      WHEN NEW.kk_number ILIKE 'KKG%' THEN 'KKG'
      WHEN NEW.kk_number ILIKE 'KK%' THEN 'KK'
      ELSE NULL
    END;

    FOREACH v_name IN ARRAY ARRAY['KK', 'KKG'] LOOP
      SELECT id INTO v_kk_tag_id FROM public.tags WHERE account_id = v_account_id AND name = v_name;
      IF v_kk_tag_id IS NULL THEN
        INSERT INTO public.tags (account_id, user_id, name)
        VALUES (v_account_id, NEW.id, v_name)
        RETURNING id INTO v_kk_tag_id;
      END IF;

      IF v_name = v_kk_name THEN
        INSERT INTO public.contact_tags (contact_id, tag_id)
        VALUES (v_contact_id, v_kk_tag_id)
        ON CONFLICT (contact_id, tag_id) DO NOTHING;
      ELSE
        DELETE FROM public.contact_tags WHERE contact_id = v_contact_id AND tag_id = v_kk_tag_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to sync profile % to wacrm contact: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Re-sync when the KK number changes too (it was previously only name/phone/role/consent).
DROP TRIGGER IF EXISTS on_profile_sync_wacrm_contact ON public.profiles;
CREATE TRIGGER on_profile_sync_wacrm_contact
  AFTER INSERT OR UPDATE OF full_name, phone, role, whatsapp_consent, kk_number ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_wacrm_contact();

-- Backfill: create both tags, then tag every already-synced contact from its profile.
DO $$
DECLARE
  v_account_id uuid;
  v_owner uuid;
BEGIN
  SELECT id INTO v_account_id FROM public.accounts WHERE name = 'Kiranam' LIMIT 1;
  IF v_account_id IS NULL THEN RETURN; END IF;
  SELECT user_id INTO v_owner FROM public.tags WHERE account_id = v_account_id ORDER BY created_at LIMIT 1;
  IF v_owner IS NULL THEN RETURN; END IF;

  INSERT INTO public.tags (account_id, user_id, name)
  SELECT v_account_id, v_owner, n FROM unnest(ARRAY['KK', 'KKG']) AS n
  WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.account_id = v_account_id AND t.name = n);

  INSERT INTO public.contact_tags (contact_id, tag_id)
  SELECT c.id, t.id
  FROM public.contacts c
  JOIN public.profiles p ON p.id = c.kiranam_profile_id
  JOIN public.tags t ON t.account_id = v_account_id
   AND t.name = CASE WHEN p.kk_number ILIKE 'KKG%' THEN 'KKG' WHEN p.kk_number ILIKE 'KK%' THEN 'KK' END
  WHERE c.account_id = v_account_id
  ON CONFLICT (contact_id, tag_id) DO NOTHING;
END $$;
