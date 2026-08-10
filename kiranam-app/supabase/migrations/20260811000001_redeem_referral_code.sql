-- Wires a typed/scanned referral code at signup to an actual
-- contributor_assignments row, so volunteer performance can be tracked.
--
-- Contributors can't SELECT public.referrals (RLS only allows the owning
-- volunteer or an admin to read it) and can't INSERT into
-- contributor_assignments (admin-only), so the lookup + assignment has to
-- happen inside a SECURITY DEFINER function rather than client-side queries.
-- This is also the only place assignment happens now — there is no
-- automatic/round-robin assignment anywhere else in the app.
create or replace function public.redeem_referral_code(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  target_volunteer_id uuid;
begin
  if normalized = '' or auth.uid() is null then
    return false;
  end if;

  select volunteer_id into target_volunteer_id
  from public.referrals
  where referral_code = normalized;

  if target_volunteer_id is null or target_volunteer_id = auth.uid() then
    return false;
  end if;

  insert into public.contributor_assignments (volunteer_id, contributor_id)
  values (target_volunteer_id, auth.uid())
  on conflict (volunteer_id, contributor_id) do nothing;

  return true;
end;
$$;

grant execute on function public.redeem_referral_code(text) to authenticated;
