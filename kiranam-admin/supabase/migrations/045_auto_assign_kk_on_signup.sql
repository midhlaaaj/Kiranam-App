-- Auto-assign a KK / KKG number the moment a profile is created, for every way a
-- profile can appear (app sign-up via phone OTP, admin panel registration), so
-- no app release is needed.
--
-- Follows the admin panel's two switches in app_settings:
--   auto_assign_kk_number   -> KK   numbers for Indian phones (+91)
--   auto_assign_kkg_number  -> KKG  numbers for every other country
-- When a switch is off nothing happens for that series (numbers stay manual).
--
-- Mirrors the admin panel's logic (kiranam-admin/src/lib/kk.ts):
--   * the next number continues from the highest one in the real run of
--     numbers, ignoring isolated outliers (a phone number saved as a KK number)
--     — an outlier is a number more than 500 above the next one below it;
--   * numbers already taken (case-insensitive) are skipped.

-- Next free number for a series ('KK' or 'KKG'), e.g. 'KK2272'.
CREATE OR REPLACE FUNCTION public.next_kk_number(series text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  high_water bigint;
  n bigint;
BEGIN
  WITH nums AS (
    SELECT DISTINCT substring(kk_number FROM '(\d+)$')::bigint AS v
    FROM public.profiles
    WHERE kk_number ~* ('^' || series || '\d{1,12}$')
  ), ranked AS (
    SELECT v, lead(v) OVER (ORDER BY v DESC) AS below FROM nums
  )
  SELECT v INTO high_water FROM ranked WHERE below IS NULL OR v - below <= 500 ORDER BY v DESC LIMIT 1;

  n := coalesce(high_water, 0) + 1;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(kk_number) = lower(series || n)) LOOP
    n := n + 1;
  END LOOP;
  RETURN series || n;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_kk_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  series text;
  enabled text;
BEGIN
  -- Only people with a phone number, and only contributors: admins sign in with
  -- email, and coordinators start life as contributors so they are numbered here.
  IF NEW.kk_number IS NOT NULL OR NEW.phone IS NULL OR NEW.role <> 'contributor' THEN
    RETURN NEW;
  END IF;

  series := CASE WHEN NEW.phone ~ '^\+?91' THEN 'KK' ELSE 'KKG' END;

  SELECT value INTO enabled FROM public.app_settings
   WHERE key = CASE series WHEN 'KK' THEN 'auto_assign_kk_number' ELSE 'auto_assign_kkg_number' END;
  IF enabled IS DISTINCT FROM 'true' THEN
    RETURN NEW;
  END IF;

  -- One at a time per series, so two sign-ups at once never pick the same number.
  PERFORM pg_advisory_xact_lock(hashtext('kk_assign_' || series));
  NEW.kk_number := public.next_kk_number(series);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_kk_on_profile_insert ON public.profiles;
CREATE TRIGGER assign_kk_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_kk_on_profile_insert();

-- Not callable from the app or the public API.
REVOKE ALL ON FUNCTION public.next_kk_number(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_kk_on_profile_insert() FROM PUBLIC, anon, authenticated;
