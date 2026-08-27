-- Admin invites previously never expired — an invite email granting
-- eventual admin dashboard access stayed valid forever until someone
-- manually revoked it. Add an expiry and enforce it everywhere an
-- invite's validity is checked.
--
-- Also closes a privilege-escalation hole found while making this change:
-- promote_if_invited(p_user_id, p_email) sets profiles.role = 'admin' for
-- whatever p_user_id is passed in, as long as p_email matches a pending
-- invite. It's meant to be called ONLY internally by the auth.users
-- triggers (which run with elevated privileges regardless of grants) — but
-- Postgres grants EXECUTE to PUBLIC by default on function creation, so it
-- was directly callable via PostgREST's /rest/v1/rpc endpoint by both
-- `anon` and `authenticated`. That meant anyone, including someone not even
-- logged in, could call it with their own uid and any pending invited email
-- to self-promote to admin without ever touching that inbox. Revoked.
--
-- Note: this table and function actually live on a Supabase project whose
-- applied-migration history doesn't match this repo's migrations/ folder
-- (see 20260724000001_merge_wacrm_schema.sql's own header comment, and
-- WHATSAPP.md) — admin_invites/is_email_invited/promote_if_invited predate
-- every migration file here and were introspected from the live database,
-- not created by one. This file is added for documentation/history going
-- forward even though its predecessors weren't tracked this way.

alter table public.admin_invites
  add column expires_at timestamptz not null default (now() + interval '7 days');

create or replace function public.is_email_invited(p_email text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.admin_invites
    where lower(email) = lower(p_email) and used_at is null and expires_at > now()
  );
$function$;

create or replace function public.promote_if_invited(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  matched_email text;
begin
  if p_email is null then
    return;
  end if;

  update public.admin_invites
  set used_at = now()
  where lower(email) = lower(p_email) and used_at is null and expires_at > now()
  returning email into matched_email;

  if matched_email is not null then
    update public.profiles set role = 'admin' where id = p_user_id;
  end if;
end;
$function$;

revoke execute on function public.promote_if_invited(uuid, text) from public;
grant execute on function public.promote_if_invited(uuid, text) to service_role, postgres;
