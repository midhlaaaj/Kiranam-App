-- Regular authenticated clients can never query auth.users directly (Supabase
-- blocks that at the schema level regardless of RLS). This security-definer
-- function is the safe way to expose just last_sign_in_at for admins, and
-- only to other admins.

create or replace function public.admin_directory()
returns table (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.email, p.created_at, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'admin' and public.is_admin();
$$;
