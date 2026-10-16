-- Load-speed pass for the admin panel and app.

-- ── 1. Indexes on the foreign keys / filters every list and detail page uses
-- (flagged by Supabase's performance advisor as unindexed).
create index if not exists idx_contributions_contributor_id on public.contributions (contributor_id);
create index if not exists idx_contributions_campaign_id on public.contributions (campaign_id);
create index if not exists idx_contributions_collected_by on public.contributions (collected_by);
create index if not exists idx_contributions_status_created on public.contributions (status, created_at desc);
create index if not exists idx_contributor_assignments_contributor on public.contributor_assignments (contributor_id);
create index if not exists idx_contributor_notes_contributor on public.contributor_notes (contributor_id);
create index if not exists idx_contributor_notes_volunteer on public.contributor_notes (volunteer_id);
create index if not exists idx_referrals_volunteer on public.referrals (volunteer_id);
create index if not exists idx_volunteer_applications_profile on public.volunteer_applications (profile_id);
create index if not exists idx_volunteer_applications_reviewed_by on public.volunteer_applications (reviewed_by);
create index if not exists idx_volunteer_applications_status on public.volunteer_applications (status, created_at desc);
create index if not exists idx_notifications_profile_unread on public.notifications (profile_id, is_read);
create index if not exists idx_profiles_role_created on public.profiles (role, created_at desc);
create index if not exists idx_campaigns_created_by on public.campaigns (created_by);
create index if not exists idx_campaign_images_campaign on public.campaign_images (campaign_id);
create index if not exists idx_event_images_event on public.event_images (event_id);
create index if not exists idx_admin_audit_log_admin on public.admin_audit_log (admin_id);
create index if not exists idx_admin_invites_invited_by on public.admin_invites (invited_by);

-- ── 2. RLS: evaluate auth.uid() / is_admin() once per query instead of once
-- per row (Supabase advisor "auth_rls_initplan"). Same rules, same results.
alter policy commitments_insert_own_or_admin on public.commitments
  with check ((contributor_id = (select auth.uid())) or (select public.is_admin()));
alter policy commitments_select_own_or_admin on public.commitments
  using ((contributor_id = (select auth.uid())) or (select public.is_admin()));
alter policy commitments_update_own_or_admin on public.commitments
  using ((contributor_id = (select auth.uid())) or (select public.is_admin()));

alter policy contributions_insert on public.contributions
  with check (
    ((contributor_id = (select auth.uid())) and (status <> 'success'))
    or (select public.is_admin())
    or (public.is_assigned_volunteer(contributor_id) and is_offline = true and status = 'success' and collected_by = (select auth.uid()))
  );
alter policy contributions_select on public.contributions
  using ((contributor_id = (select auth.uid())) or (select public.is_admin()) or public.is_assigned_volunteer(contributor_id));
alter policy contributions_update_admin on public.contributions
  using ((select public.is_admin()));

alter policy contributor_assignments_select on public.contributor_assignments
  using ((volunteer_id = (select auth.uid())) or (contributor_id = (select auth.uid())) or (select public.is_admin()));
alter policy contributor_assignments_write on public.contributor_assignments
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter policy contributor_notes_insert on public.contributor_notes
  with check (public.is_assigned_volunteer(contributor_id) and volunteer_id = (select auth.uid()));
alter policy contributor_notes_select on public.contributor_notes
  using ((public.is_assigned_volunteer(contributor_id) and volunteer_id = (select auth.uid())) or (select public.is_admin()));

alter policy notifications_delete_own_or_admin on public.notifications
  using ((profile_id = (select auth.uid())) or (select public.is_admin()));
alter policy notifications_insert on public.notifications
  with check ((profile_id = (select auth.uid())) or (select public.is_admin()));
alter policy notifications_select_own_or_admin on public.notifications
  using ((profile_id = (select auth.uid())) or (select public.is_admin()));
alter policy notifications_update_own_or_admin on public.notifications
  using ((profile_id = (select auth.uid())) or (select public.is_admin()));

alter policy profiles_insert_own on public.profiles
  with check (id = (select auth.uid()));
alter policy profiles_select_own_or_admin_or_assigned on public.profiles
  using ((id = (select auth.uid())) or (select public.is_admin()) or public.is_assigned_volunteer(id));
alter policy profiles_update_own_or_admin on public.profiles
  using ((id = (select auth.uid())) or (select public.is_admin()))
  with check (
    (select public.is_admin())
    or ((id = (select auth.uid())) and (role = (select p.role from public.profiles p where p.id = (select auth.uid()))))
  );

alter policy referrals_insert on public.referrals
  with check (volunteer_id = (select auth.uid()));
alter policy referrals_select on public.referrals
  using ((volunteer_id = (select auth.uid())) or (select public.is_admin()));

alter policy volunteer_applications_insert on public.volunteer_applications
  with check (profile_id = (select auth.uid()));
alter policy volunteer_applications_select on public.volunteer_applications
  using ((profile_id = (select auth.uid())) or (select public.is_admin()));
alter policy volunteer_applications_update on public.volunteer_applications
  using ((select public.is_admin()) or ((profile_id = (select auth.uid())) and status = 'pending'));

alter policy campaigns_write_admin on public.campaigns
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy campaign_images_write_admin on public.campaign_images
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy events_write_admin on public.events
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy event_images_write_admin on public.event_images
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── 3. Campaign/event status upkeep moves off page loads (the Campaigns and
-- Events admin pages used to run these writes before every render).
create or replace function public.refresh_campaign_event_status()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.self_heal_campaign_completion();
  update public.events
    set is_past = (event_date < current_date)
    where event_date is not null and is_past is distinct from (event_date < current_date);
end;
$function$;

select cron.schedule('refresh-campaign-event-status', '*/15 * * * *', 'select public.refresh_campaign_event_status();');
