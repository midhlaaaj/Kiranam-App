-- Append-only audit trail of admin actions taken in kiranam-admin.
-- Deliberately no update/delete policy — RLS blocks both by default when no
-- policy exists for a command, so the log can't be edited or erased by admins.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log_select_admin" on public.admin_audit_log for select
  using (public.is_admin());
create policy "admin_audit_log_insert_admin" on public.admin_audit_log for insert
  with check (public.is_admin());
