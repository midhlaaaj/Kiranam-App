-- profiles_update_own_or_admin's WITH CHECK read public.profiles from inside a
-- policy on public.profiles (added in 032), which Postgres rejects with
-- "infinite recursion detected in policy for relation profiles" — breaking
-- every profile UPDATE made under a user's own session (revoke admin,
-- edit name/email, etc.). Read the caller's current role through a
-- SECURITY DEFINER helper instead, like is_admin() does.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

alter policy profiles_update_own_or_admin on public.profiles
  using ((id = (select auth.uid())) or (select public.is_admin()))
  with check (
    (select public.is_admin())
    or ((id = (select auth.uid())) and (role::text = (select public.current_user_role())))
  );
