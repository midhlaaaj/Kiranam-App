-- profiles_update_own_or_admin had no WITH CHECK, so it only restricted which
-- row a user could touch (their own, or any row if admin) — not which values
-- they wrote. A contributor could call `update profiles set role='admin'` on
-- their own row directly and self-promote, bypassing the app UI entirely.

drop policy "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_update_own_or_admin" on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()))
  );
