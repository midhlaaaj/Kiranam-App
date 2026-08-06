-- Fixes a bug where invited admins created via
-- supabaseAdmin.auth.admin.createUser({ email_confirm: true }) (see
-- src/app/signup/actions.ts) never actually got promoted to role='admin'.
--
-- handle_new_user()'s admin-promotion branch only runs when
-- new.email_confirmed_at is already set at INSERT time. But Supabase's
-- GoTrue server inserts the auth.users row first (unconfirmed), then issues
-- a separate UPDATE a few milliseconds later to set email_confirmed_at —
-- even when email_confirm: true was requested. The AFTER INSERT trigger
-- always fires before that UPDATE, so new.email_confirmed_at is always
-- NULL there, and the promotion is silently skipped every time.
--
-- Fix: factor the invite-matching logic into promote_if_invited(), keep it
-- on INSERT as a (currently dead, but harmless) fast path, and add it to a
-- new AFTER UPDATE trigger that fires exactly when email_confirmed_at
-- transitions from NULL to set — which covers both this admin-created path
-- and the normal signUp()-then-click-confirmation-link path.

CREATE OR REPLACE FUNCTION public.promote_if_invited(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  matched_email text;
begin
  if p_email is null then
    return;
  end if;

  update public.admin_invites
  set used_at = now()
  where lower(email) = lower(p_email) and used_at is null
  returning email into matched_email;

  if matched_email is not null then
    update public.profiles set role = 'admin' where id = p_user_id;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, user_id, phone, email)
  values (new.id, new.id, new.phone, new.email)
  on conflict (id) do nothing;

  if new.email_confirmed_at is not null then
    perform public.promote_if_invited(new.id, new.email);
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.promote_if_invited(new.id, new.email);
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_email_confirmed();
