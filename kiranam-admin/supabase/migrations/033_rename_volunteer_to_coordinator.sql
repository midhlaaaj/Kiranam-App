-- Phase B of the Volunteer → Coordinator rename: the structural rename.
--
-- Ship together with (in this order, within minutes):
--   1. this migration
--   2. the kiranam-admin deploy from the same branch
--   3. the kiranam-app 1.2.0 release — and only then raise
--      app_config.min_app_version to '1.2.0' (last statement below,
--      commented out) so older installs show "Update required" instead of
--      calling tables/columns/roles that no longer exist.
--
-- Run as one transaction (Supabase migrations are). Policies, constraints
-- and indexes follow renamed columns/tables automatically (they reference
-- them by OID); function bodies are text, so every function that mentions
-- the old names is recreated below.

-- ── 1. Tables & columns
alter table public.volunteer_applications rename to coordinator_applications;
alter table public.coordinator_applications rename constraint volunteer_applications_pkey to coordinator_applications_pkey;
alter table public.coordinator_applications rename constraint volunteer_applications_profile_id_fkey to coordinator_applications_profile_id_fkey;
alter table public.coordinator_applications rename constraint volunteer_applications_reviewed_by_fkey to coordinator_applications_reviewed_by_fkey;
alter table public.coordinator_applications rename constraint volunteer_applications_status_check to coordinator_applications_status_check;
alter policy volunteer_applications_insert on public.coordinator_applications rename to coordinator_applications_insert;
alter policy volunteer_applications_select on public.coordinator_applications rename to coordinator_applications_select;
alter policy volunteer_applications_update on public.coordinator_applications rename to coordinator_applications_update;
alter index if exists public.idx_volunteer_applications_profile rename to idx_coordinator_applications_profile;
alter index if exists public.idx_volunteer_applications_reviewed_by rename to idx_coordinator_applications_reviewed_by;
alter index if exists public.idx_volunteer_applications_status rename to idx_coordinator_applications_status;

alter table public.contributor_assignments rename column volunteer_id to coordinator_id;
alter table public.contributor_assignments rename constraint contributor_assignments_volunteer_id_contributor_id_key to contributor_assignments_coordinator_id_contributor_id_key;
alter table public.contributor_assignments rename constraint contributor_assignments_volunteer_id_fkey to contributor_assignments_coordinator_id_fkey;

alter table public.contributor_notes rename column volunteer_id to coordinator_id;
alter table public.contributor_notes rename constraint contributor_notes_volunteer_id_fkey to contributor_notes_coordinator_id_fkey;
alter index if exists public.idx_contributor_notes_volunteer rename to idx_contributor_notes_coordinator;

alter table public.referrals rename column volunteer_id to coordinator_id;
alter table public.referrals rename constraint referrals_volunteer_id_fkey to referrals_coordinator_id_fkey;
alter index if exists public.idx_referrals_volunteer rename to idx_referrals_coordinator;

-- ── 2. Functions (renamed ones keep their OID, so policies follow them)
alter function public.is_assigned_volunteer(uuid) rename to is_assigned_coordinator;
create or replace function public.is_assigned_coordinator(target_contributor_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.contributor_assignments
    where coordinator_id = auth.uid() and contributor_id = target_contributor_id
  );
$function$;

alter function public.approve_volunteer_application(uuid, uuid) rename to approve_coordinator_application;
create or replace function public.approve_coordinator_application(p_application_id uuid, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.coordinator_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_application_id;

  update public.profiles
  set role = 'coordinator'
  where id = p_profile_id;

  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'approve_coordinator_application',
    'coordinator_applications',
    p_application_id,
    jsonb_build_object('profileId', p_profile_id)
  );
end;
$function$;

create or replace function public.redeem_referral_code(code text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  normalized text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  target_coordinator_id uuid;
begin
  if normalized = '' or auth.uid() is null then
    return false;
  end if;

  select coordinator_id into target_coordinator_id
  from public.referrals
  where referral_code = normalized;

  if target_coordinator_id is null or target_coordinator_id = auth.uid() then
    return false;
  end if;

  insert into public.contributor_assignments (coordinator_id, contributor_id, source)
  values (target_coordinator_id, auth.uid(), 'referral')
  on conflict (coordinator_id, contributor_id) do nothing;

  return true;
end;
$function$;

create or replace function public.sync_profile_to_wacrm_contact()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_account_id uuid;
  v_contact_id uuid;
  v_tag_name text;
  v_tag_id uuid;
begin
  if new.role not in ('contributor', 'coordinator') then
    return new;
  end if;
  if new.phone is null or new.phone = '' then
    return new;
  end if;

  select id into v_account_id from public.accounts where name = 'Kiranam' limit 1;
  if v_account_id is null then
    return new;
  end if;

  insert into public.contacts (account_id, user_id, phone, name, kiranam_profile_id, whatsapp_consent)
  values (v_account_id, new.id, new.phone, coalesce(nullif(new.full_name, ''), new.phone), new.id, new.whatsapp_consent)
  on conflict (kiranam_profile_id) where kiranam_profile_id is not null
  do update set phone = excluded.phone, name = excluded.name, whatsapp_consent = excluded.whatsapp_consent
  returning id into v_contact_id;

  v_tag_name := case new.role when 'contributor' then 'Contributor' else 'Coordinator' end;

  select id into v_tag_id from public.tags where account_id = v_account_id and name = v_tag_name;
  if v_tag_id is null then
    insert into public.tags (account_id, user_id, name)
    values (v_account_id, new.id, v_tag_name)
    returning id into v_tag_id;
  end if;

  if v_tag_id is not null and v_contact_id is not null then
    insert into public.contact_tags (contact_id, tag_id)
    values (v_contact_id, v_tag_id)
    on conflict (contact_id, tag_id) do nothing;
  end if;

  return new;
exception when others then
  raise warning 'Failed to sync profile % to wacrm contact: %', new.id, sqlerrm;
  return new;
end;
$function$;

create or replace function public.trg_notify_admin_note_added()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_author_role text;
  v_assignment record;
begin
  select role into v_author_role from public.profiles where id = new.coordinator_id;
  if v_author_role = 'admin' then
    for v_assignment in select coordinator_id from public.contributor_assignments where contributor_id = new.contributor_id loop
      perform public.notify(
        v_assignment.coordinator_id,
        'New note from Kiranam admin',
        'An admin left a note on one of your contributors.',
        'system',
        '/coordinator-contributor-detail?id=' || new.contributor_id
      );
    end loop;
  end if;
  return new;
end;
$function$;

create or replace function public.trg_notify_application_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.notify(new.profile_id, 'You''re now a Kiranam coordinator!', 'Your coordinator application was approved — welcome aboard.', 'system', '/(coordinator-tabs)/dashboard');
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    perform public.notify(new.profile_id, 'Coordinator application update', 'Your coordinator application wasn''t approved this time.', 'system', '/coordinator-rejected');
  end if;
  return new;
end;
$function$;

create or replace function public.trg_notify_contributor_assigned()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name text;
begin
  select full_name into v_name from public.profiles where id = new.contributor_id;
  perform public.notify(
    new.coordinator_id,
    'New contributor assigned',
    coalesce(v_name, 'A contributor') || ' has been assigned to you.',
    'system',
    '/(coordinator-tabs)/contributors'
  );
  return new;
end;
$function$;

create or replace function public.trg_notify_new_campaign()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles where role in ('contributor', 'coordinator') loop
    perform public.notify(
      v_profile.id,
      'New campaign: ' || new.title,
      'A new campaign just launched — take a look and help spread the word.',
      'campaign',
      '/campaign-detail?id=' || new.id
    );
  end loop;
  return new;
end;
$function$;

create or replace function public.trg_notify_new_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles where role in ('contributor', 'coordinator') loop
    perform public.notify(
      v_profile.id,
      'New event: ' || new.title,
      'A new Kiranam event was just announced.',
      'system',
      '/event-detail?id=' || new.id
    );
  end loop;
  return new;
end;
$function$;

alter function public.trg_notify_new_volunteer_application() rename to trg_notify_new_coordinator_application;
create or replace function public.trg_notify_new_coordinator_application()
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
      '/coordinators'
    );
  end loop;
  return new;
end;
$function$;

alter trigger on_volunteer_application_created on public.coordinator_applications rename to on_coordinator_application_created;
alter trigger on_volunteer_application_status_change on public.coordinator_applications rename to on_coordinator_application_status_change;

create or replace function public.run_daily_notification_checks()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row record;
  v_assignment record;
begin
  -- Autopay heads-up: 1 day before it actually charges. (Manual-pay
  -- reminders are sent by kiranam-admin's /api/cron/kiranam-reminders.)
  for v_row in
    select contributor_id, monthly_amount from public.commitments
    where autopay_enabled = true and next_due_date = current_date + 1
  loop
    perform public.notify(
      v_row.contributor_id,
      'Autopay charging tomorrow',
      'Your ₹' || v_row.monthly_amount || ' monthly contribution will be charged tomorrow.',
      'contribution',
      null
    );
  end loop;

  -- Newly-overdue contributor → notify their assigned coordinator(s), once,
  -- the day it first lapses (not every day it stays overdue).
  for v_row in
    select c.contributor_id, p.full_name from public.commitments c
    join public.profiles p on p.id = c.contributor_id
    where c.autopay_enabled = false and c.next_due_date = current_date - 1
  loop
    for v_assignment in select coordinator_id from public.contributor_assignments where contributor_id = v_row.contributor_id loop
      perform public.notify(
        v_assignment.coordinator_id,
        'Contributor payment overdue',
        coalesce(v_row.full_name, 'One of your contributors') || '''s monthly contribution is now overdue.',
        'system',
        '/(coordinator-tabs)/contributors'
      );
    end loop;
  end loop;

  -- Monthly giving summary for coordinators — only fires on the 1st.
  if extract(day from current_date) = 1 then
    for v_row in
      select
        ca.coordinator_id,
        coalesce(sum(c.amount), 0) as total
      from public.contributor_assignments ca
      join public.contributions c on c.contributor_id = ca.contributor_id
        and c.status = 'success'
        and c.created_at >= date_trunc('month', current_date) - interval '1 month'
        and c.created_at < date_trunc('month', current_date)
      group by ca.coordinator_id
      having coalesce(sum(c.amount), 0) > 0
    loop
      perform public.notify(
        v_row.coordinator_id,
        'Your monthly giving summary',
        'Your contributors gave ₹' || v_row.total || ' last month. Thank you for your work!',
        'system',
        '/(coordinator-tabs)/dashboard'
      );
    end loop;
  end if;
end;
$function$;

-- ── 3. The role itself. The WhatsApp CRM tag is renamed first so the
-- profile sync trigger (fired by the update below) reuses it.
update public.tags set name = 'Coordinator'
  where name = 'Volunteer'
    and not exists (select 1 from public.tags t2 where t2.account_id = tags.account_id and t2.name = 'Coordinator');

alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'coordinator' where role = 'volunteer';
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['contributor'::text, 'coordinator'::text, 'admin'::text]));

-- ── 4. Stored data that names the old routes/actions.
update public.notifications
  set deep_link = replace(deep_link, 'volunteer', 'coordinator')
  where deep_link like '%volunteer%';

update public.admin_audit_log
  set action = replace(action, 'volunteer', 'coordinator')
  where action like '%volunteer%';
update public.admin_audit_log
  set entity_type = 'coordinator_applications'
  where entity_type = 'volunteer_applications';
update public.admin_audit_log
  set details = (details - 'volunteerId') || jsonb_build_object('coordinatorId', details -> 'volunteerId')
  where details ? 'volunteerId';
update public.admin_audit_log
  set details = jsonb_set(details, '{audience}', '"coordinator"')
  where details ->> 'audience' = 'volunteer';

-- ── 5. After kiranam-app 1.2.0 is available to download, run:
--   update public.app_config set value = '1.2.0', updated_at = now() where key = 'min_app_version';
