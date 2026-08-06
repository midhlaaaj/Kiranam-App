-- Fixes a data-integrity bug: the admin dashboard's approveApplication()
-- server action previously ran two separate, non-transactional updates
-- (volunteer_applications.status, then profiles.role). When the second
-- update failed after the first succeeded, an application could end up
-- permanently stuck "approved" while profiles.role stayed 'contributor' —
-- which the mobile app's /pending screen treated as approved (it only
-- checks application status) while /otp treated as not-yet-a-volunteer
-- (it checks both role and status), landing the user in a stuck loop.
--
-- This RPC does both writes plus the audit log insert in one transaction
-- so they can never partially apply.
CREATE OR REPLACE FUNCTION public.approve_volunteer_application(
  p_application_id uuid,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.volunteer_applications
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_application_id;

  UPDATE public.profiles
  SET role = 'volunteer'
  WHERE id = p_profile_id;

  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'approve_volunteer_application',
    'volunteer_applications',
    p_application_id,
    jsonb_build_object('profileId', p_profile_id)
  );
END;
$$;
