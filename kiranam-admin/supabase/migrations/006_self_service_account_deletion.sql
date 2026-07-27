-- Self-service account deletion (Apple App Store Guideline 5.1.1(v) —
-- any app that lets users create an account must let them delete it
-- from within the app).
--
-- SECURITY DEFINER so it can delete from auth.users despite the caller
-- having no direct privilege there — this is Supabase's own documented
-- pattern for self-service account deletion. Deleting the auth.users
-- row cascades through profiles.id (ON DELETE CASCADE) and everything
-- FK'd to it (commitments, contributions, volunteer_applications,
-- referrals, contributor_assignments, notifications).
--
-- Only ever deletes the caller's own row (auth.uid()) — never accepts
-- a target id, so there is no privilege-escalation surface.
--
-- Note: a handful of admin-only audit columns (campaigns.created_by,
-- volunteer_applications.reviewed_by, admin_invites.invited_by,
-- admin_audit_log.admin_id) are NO ACTION, not CASCADE — deleting an
-- account that has ever performed one of those admin actions would
-- fail with a foreign-key violation. Not a concern for this RPC's
-- actual audience (kiranam-app contributors/volunteers, who never
-- appear in those columns); admins manage their accounts via
-- kiranam-admin, not this consumer app.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
