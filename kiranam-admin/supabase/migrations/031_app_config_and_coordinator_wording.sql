-- Phase A of the Volunteer → Coordinator rename: user-facing wording only.
-- Table/column/role/route names are untouched here, so this is safe with
-- every app version already installed. The structural rename is Phase B
-- (032_rename_volunteer_to_coordinator.sql), shipped together with an app
-- release and a min_app_version bump.

-- ── App config read by the mobile app at launch (UpdateRequiredGate).
create table if not exists public.app_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists app_config_read on public.app_config;
create policy app_config_read on public.app_config
  for select to anon, authenticated using (true);

insert into public.app_config (key, value) values
  ('min_app_version', '1.0.0'),
  ('store_url_android', 'https://play.google.com/store/apps/details?id=com.kiranam.app'),
  ('store_url_ios', null)
on conflict (key) do nothing;

-- ── Push/in-app notification wording.
create or replace function public.trg_notify_application_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.notify(new.profile_id, 'You''re now a Kiranam coordinator!', 'Your coordinator application was approved — welcome aboard.', 'system', '/(volunteer-tabs)/dashboard');
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    perform public.notify(new.profile_id, 'Coordinator application update', 'Your coordinator application wasn''t approved this time.', 'system', '/volunteer-rejected');
  end if;
  return new;
end;
$function$;

create or replace function public.trg_notify_new_volunteer_application()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name text;
  v_admin record;
begin
  select full_name into v_name from public.profiles where id = new.profile_id;
  for v_admin in select id from public.profiles where role = 'admin' loop
    perform public.notify(
      v_admin.id,
      'New coordinator application',
      coalesce(v_name, 'Someone') || ' applied to be a coordinator — review their application.',
      'system',
      '/volunteers'
    );
  end loop;
  return new;
end;
$function$;
