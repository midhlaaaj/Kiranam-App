-- ============================================================
-- wacrm merge, step 1 of 4 — profiles identity columns
--
-- wacrm's business logic (RLS, RPCs, storage policies) keys off
-- profiles.user_id everywhere; Kiranam's profiles.id already IS
-- auth.users.id. Rather than rewrite wacrm's logic, we add a
-- user_id column that always mirrors id, satisfying every wacrm
-- reference unmodified.
--
-- Also merges wacrm's handle_new_user() behavior (setting user_id)
-- into Kiranam's EXISTING handle_new_user() function, preserving
-- 100% of its current logic (admin_invites auto-promotion) exactly
-- as introspected from the live database.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS beta_features text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Merged handle_new_user(): Kiranam's exact existing logic (profile
-- insert by id, admin_invites matching/promotion) plus user_id set
-- on insert so it always mirrors id going forward too.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  matched_email text;
begin
  insert into public.profiles (id, user_id, phone, email)
  values (new.id, new.id, new.phone, new.email)
  on conflict (id) do nothing;

  if new.email is not null then
    update public.admin_invites
    set used_at = now()
    where lower(email) = lower(new.email) and used_at is null
    returning email into matched_email;

    if matched_email is not null then
      update public.profiles set role = 'admin' where id = new.id;
    end if;
  end if;

  return new;
end;
$$;
