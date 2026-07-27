-- ============================================================
-- wacrm merge, step 2 of 4 — accounts / membership tables
--
-- Run this AFTER 001_wacrm_merge_step1_profiles_identity.sql.
--
-- Creates wacrm's multi-tenant account model (accounts,
-- account_invitations, account_role_enum, is_account_member()),
-- verbatim from wacrm's own migration 017 — this part has no
-- Kiranam-specific data-migration risk, it's brand-new tables.
--
-- profiles.account_id / account_role are added NULLABLE (unlike
-- wacrm's own migration, which forces them NOT NULL after
-- backfilling one personal account per user). Nullable here on
-- purpose: only rows that need comm-center access get these set
-- (via the admin-provisioning trigger in step 3's follow-up), not
-- every contributor/volunteer.
--
-- Also adds one new ADDITIVE read policy on profiles (does not
-- touch/drop Kiranam's 3 existing policies — verified live before
-- writing this) and the privilege-column-lockdown trigger from
-- wacrm's migration 034 (prevents a browser client from self-
-- promoting account_role/account_id).
-- ============================================================

-- ============================================================
-- TYPES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role_enum') THEN
    CREATE TYPE account_role_enum AS ENUM ('owner', 'admin', 'agent', 'viewer');
  END IF;
END $$;

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_one_per_owner
  ON public.accounts(owner_user_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at ON public.accounts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ACCOUNT_INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  role account_role_enum NOT NULL CHECK (role <> 'owner'),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_account_invitations_account_pending
  ON public.account_invitations(account_id, expires_at)
  WHERE accepted_at IS NULL;

ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILE EXTENSION (nullable — see header note)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_role account_role_enum;

CREATE INDEX IF NOT EXISTS idx_profiles_account_role
  ON public.profiles(account_id, account_role);

-- ============================================================
-- MEMBERSHIP HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_account_member(
  target_account_id UUID,
  min_role account_role_enum DEFAULT 'viewer'
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.account_id = target_account_id
      AND CASE p.account_role
            WHEN 'owner'  THEN 4
            WHEN 'admin'  THEN 3
            WHEN 'agent'  THEN 2
            WHEN 'viewer' THEN 1
          END
        >=
          CASE min_role
            WHEN 'owner'  THEN 4
            WHEN 'admin'  THEN 3
            WHEN 'agent'  THEN 2
            WHEN 'viewer' THEN 1
          END
  );
$$;

ALTER FUNCTION public.is_account_member(UUID, account_role_enum) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_account_member(UUID, account_role_enum) TO authenticated, service_role;

-- ============================================================
-- RLS — ACCOUNTS & ACCOUNT_INVITATIONS (brand-new tables, wacrm's
-- own policy design, no Kiranam equivalent to preserve)
-- ============================================================
DROP POLICY IF EXISTS accounts_select ON public.accounts;
DROP POLICY IF EXISTS accounts_update ON public.accounts;
CREATE POLICY accounts_select ON public.accounts FOR SELECT
  USING (is_account_member(id));
CREATE POLICY accounts_update ON public.accounts FOR UPDATE
  USING (is_account_member(id, 'admin'))
  WITH CHECK (is_account_member(id, 'admin'));

DROP POLICY IF EXISTS account_invitations_select ON public.account_invitations;
DROP POLICY IF EXISTS account_invitations_modify ON public.account_invitations;
CREATE POLICY account_invitations_select ON public.account_invitations FOR SELECT
  USING (is_account_member(account_id, 'admin'));
CREATE POLICY account_invitations_modify ON public.account_invitations FOR ALL
  USING (is_account_member(account_id, 'admin'))
  WITH CHECK (is_account_member(account_id, 'admin'));

-- ============================================================
-- RLS — PROFILES: ONE NEW ADDITIVE POLICY ONLY
--
-- Kiranam's existing 3 policies (profiles_insert_own,
-- profiles_select_own_or_admin_or_assigned, profiles_update_own_or_admin)
-- are untouched. Postgres RLS policies are OR'd together (permissive
-- by default), so this only WIDENS read access — lets wacrm account
-- teammates see each other's profile row (for the Members list) —
-- without narrowing or replacing anything that exists today.
-- ============================================================
DROP POLICY IF EXISTS wacrm_profiles_select ON public.profiles;
CREATE POLICY wacrm_profiles_select ON public.profiles FOR SELECT
  USING (is_account_member(account_id));

-- ============================================================
-- Lock down account_role / account_id from direct client writes
-- (wacrm migration 034 — GHSA-fg5p-2qc3-jmxr). Only SECURITY
-- DEFINER functions (postgres) or service_role can change these.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_profile_privilege_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.account_role IS DISTINCT FROM OLD.account_role
      OR NEW.account_id IS DISTINCT FROM OLD.account_id)
     AND current_user = 'authenticated'
  THEN
    RAISE EXCEPTION
      'account_role and account_id cannot be changed directly; use the account member/invitation RPCs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_profile_privilege_columns() OWNER TO postgres;

DROP TRIGGER IF EXISTS enforce_profile_privilege_columns ON public.profiles;
CREATE TRIGGER enforce_profile_privilege_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_privilege_columns();

-- ============================================================
-- AUTO-PROVISION: every Kiranam admin gets comm-center access
--
-- One shared "Kiranam" account for all admins (not one personal
-- account per admin, so they collaborate on the same inbox/
-- templates/broadcasts). Fires when a profile's role becomes
-- 'admin'; also runs once now to backfill any admins that already
-- exist today.
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_wacrm_access_for_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  IF NEW.role <> 'admin' THEN
    RETURN NEW;
  END IF;
  IF NEW.account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_account_id FROM public.accounts WHERE name = 'Kiranam' LIMIT 1;
  IF v_account_id IS NULL THEN
    INSERT INTO public.accounts (name, owner_user_id) VALUES ('Kiranam', NEW.id)
    RETURNING id INTO v_account_id;
  END IF;

  NEW.account_id := v_account_id;
  NEW.account_role := 'admin';
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to auto-provision wacrm access for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.provision_wacrm_access_for_admin() OWNER TO postgres;

DROP TRIGGER IF EXISTS provision_wacrm_access_for_admin ON public.profiles;
CREATE TRIGGER provision_wacrm_access_for_admin
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.provision_wacrm_access_for_admin();

-- One-time backfill for admins that already exist today. Runs the
-- same logic as the trigger, directly, since the trigger only fires
-- on future inserts/role changes.
DO $$
DECLARE
  v_account_id UUID;
  r RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' AND account_id IS NULL) THEN
    RETURN;
  END IF;

  SELECT id INTO v_account_id FROM public.accounts WHERE name = 'Kiranam' LIMIT 1;
  IF v_account_id IS NULL THEN
    SELECT id INTO r FROM public.profiles WHERE role = 'admin' AND account_id IS NULL ORDER BY created_at LIMIT 1;
    INSERT INTO public.accounts (name, owner_user_id) VALUES ('Kiranam', r.id)
    RETURNING id INTO v_account_id;
  END IF;

  UPDATE public.profiles
  SET account_id = v_account_id, account_role = 'admin'
  WHERE role = 'admin' AND account_id IS NULL;
END $$;
