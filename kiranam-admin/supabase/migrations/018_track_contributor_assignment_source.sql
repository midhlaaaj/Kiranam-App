-- contributor_assignments rows come from two different origins today with
-- no way to tell them apart: an admin manually assigning a volunteer to a
-- contributor in kiranam-admin, or a contributor self-redeeming a
-- volunteer's referral code at signup (redeem_referral_code, kiranam-app).
-- kiranam-app needs to distinguish these for a "invite your first
-- contributor" checklist item on the volunteer dashboard, which should
-- only complete once someone has actually used their referral code — not
-- merely been assigned to them by an admin.
--
-- Existing rows predate this column and can't be retroactively classified
-- with certainty; defaulting them to 'admin' is a reasonable assumption
-- for this early-stage app's existing data, not a claim of certainty.

alter table public.contributor_assignments
  add column source text not null default 'admin'
  check (source in ('admin', 'referral'));

create or replace function public.redeem_referral_code(code text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  insert into public.contributor_assignments (volunteer_id, contributor_id, source)
  values (target_volunteer_id, auth.uid(), 'referral')
  on conflict (volunteer_id, contributor_id) do nothing;

  return true;
end;
$function$;
