-- Allowlist of emails permitted to sign up as an admin in kiranam-admin.
-- An admin adds an email here; handle_new_user() (extended in the next
-- migration) checks it on signup and auto-promotes a matching new user.

create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_invites enable row level security;

create policy "admin_invites_select_admin" on public.admin_invites for select
  using (public.is_admin());
create policy "admin_invites_insert_admin" on public.admin_invites for insert
  with check (public.is_admin());
create policy "admin_invites_delete_admin" on public.admin_invites for delete
  using (public.is_admin());

-- The signup page runs before the caller is authenticated as anyone (let
-- alone an admin), so it can't SELECT admin_invites directly under the
-- policy above. This security-definer function lets an anonymous signup
-- attempt check its own email without exposing the rest of the table.
create or replace function public.is_email_invited(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_invites
    where lower(email) = lower(p_email) and used_at is null
  );
$$;
