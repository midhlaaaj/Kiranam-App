-- Missing from the original RLS migration: an INSERT policy for profiles.
-- Without one, upsert() from register.tsx always fails with "new row violates
-- row-level security policy for table 'profiles'" — Postgres evaluates the
-- INSERT policy for INSERT ... ON CONFLICT DO UPDATE regardless of whether
-- the row already exists and the statement ultimately just updates it.

create policy "profiles_insert_own" on public.profiles for insert
  with check (id = auth.uid());
