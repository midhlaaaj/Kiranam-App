-- Row Level Security policies for Kiranam core schema

-- Helper: check if the calling user is an admin, without recursing into profiles' own RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: check if the calling user (a volunteer) is assigned to a given contributor
create or replace function public.is_assigned_volunteer(target_contributor_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.contributor_assignments
    where volunteer_id = auth.uid() and contributor_id = target_contributor_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.volunteer_applications enable row level security;
alter table public.referrals enable row level security;
alter table public.contributor_assignments enable row level security;
alter table public.campaigns enable row level security;
alter table public.events enable row level security;
alter table public.contributions enable row level security;
alter table public.notifications enable row level security;
alter table public.commitments enable row level security;

-- profiles
create policy "profiles_select_own_or_admin_or_assigned" on public.profiles for select
  using (id = auth.uid() or public.is_admin() or public.is_assigned_volunteer(id));
create policy "profiles_update_own_or_admin" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- volunteer_applications
create policy "volunteer_applications_select" on public.volunteer_applications for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "volunteer_applications_insert" on public.volunteer_applications for insert
  with check (profile_id = auth.uid());
create policy "volunteer_applications_update" on public.volunteer_applications for update
  using (public.is_admin() or (profile_id = auth.uid() and status = 'pending'));

-- referrals
create policy "referrals_select" on public.referrals for select
  using (volunteer_id = auth.uid() or public.is_admin());
create policy "referrals_insert" on public.referrals for insert
  with check (volunteer_id = auth.uid());

-- contributor_assignments
create policy "contributor_assignments_select" on public.contributor_assignments for select
  using (volunteer_id = auth.uid() or contributor_id = auth.uid() or public.is_admin());
create policy "contributor_assignments_write" on public.contributor_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

-- campaigns (public read; admin-only write)
create policy "campaigns_select_all" on public.campaigns for select
  using (true);
create policy "campaigns_write_admin" on public.campaigns for all
  using (public.is_admin())
  with check (public.is_admin());

-- events (public read; admin-only write)
create policy "events_select_all" on public.events for select
  using (true);
create policy "events_write_admin" on public.events for all
  using (public.is_admin())
  with check (public.is_admin());

-- contributions
create policy "contributions_select" on public.contributions for select
  using (contributor_id = auth.uid() or public.is_admin() or public.is_assigned_volunteer(contributor_id));
create policy "contributions_insert" on public.contributions for insert
  with check (contributor_id = auth.uid() or public.is_admin());
create policy "contributions_update_admin" on public.contributions for update
  using (public.is_admin());

-- notifications
create policy "notifications_select_own_or_admin" on public.notifications for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "notifications_insert" on public.notifications for insert
  with check (profile_id = auth.uid() or public.is_admin());
create policy "notifications_update_own_or_admin" on public.notifications for update
  using (profile_id = auth.uid() or public.is_admin());

-- commitments
create policy "commitments_select_own_or_admin" on public.commitments for select
  using (contributor_id = auth.uid() or public.is_admin());
create policy "commitments_insert_own_or_admin" on public.commitments for insert
  with check (contributor_id = auth.uid() or public.is_admin());
create policy "commitments_update_own_or_admin" on public.commitments for update
  using (contributor_id = auth.uid() or public.is_admin());
