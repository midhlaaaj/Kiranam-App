-- READ-ONLY comparison for 039_dashboard_overview.sql. Run it in the Supabase SQL editor AFTER the
-- migration has been applied (by you). Not a migration: lives next to it so it is easy to find.
--
-- It re-derives each dashboard figure with plain, independent SQL (the same formulas as
-- stage-b-readonly.sql) and diffs them against the new functions. Every "match" must be true.
-- It also shows what the OLD capped page query could see, so you can tell whether the old page
-- was wrong: when old_rows_visible < true_rows, the old totals were computed from a subset.
--
-- Set the zone the old page ran in (Vercel Node = 'UTC'; use the same value the page will pass).

with p as (select 'UTC'::text as tz),
fn_w as (select public.dashboard_overview('weekly', (select tz from p)) j),
fn_m as (select public.dashboard_overview('monthly', (select tz from p)) j),
fn_d as (select public.dashboard_overview('daily', (select tz from p)) j),
fn_cg as (select public.dashboard_contributor_growth('weekly', (select tz from p)) j),
succ as (select amount, created_at at time zone (select tz from p) as ts from public.contributions where status = 'success'),
ref_w as (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t) order by k), '[]'::jsonb) j from (select to_char(date_trunc('week', ts), 'YYYY-MM-DD') k, sum(amount) t from succ group by 1) x),
ref_m as (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t) order by k), '[]'::jsonb) j from (select to_char(date_trunc('month', ts), 'YYYY-MM') k, sum(amount) t from succ group by 1) x),
ref_d as (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t) order by k), '[]'::jsonb) j from (select to_char(ts::date, 'YYYY-MM-DD') k, sum(amount) t from succ group by 1) x),
ref_cg as (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by k), '[]'::jsonb) j from (select to_char(date_trunc('week', created_at at time zone (select tz from p)), 'YYYY-MM-DD') k, count(*) c from public.profiles where role = 'contributor' and phone is not null group by 1) x)
select jsonb_pretty(jsonb_build_object(
  'match', jsonb_build_object(
    'total_raised',          (select (j->>'total_raised')::numeric from fn_w) = (select coalesce(sum(amount),0) from public.contributions where status='success'),
    'pending_applications',  (select (j->>'pending_applications')::int from fn_w) = (select count(*) from public.volunteer_applications where status='pending'),
    'contributors',          (select (j->>'contributors')::int from fn_w) = (select count(*) from public.profiles where role='contributor' and phone is not null),
    'volunteers',            (select (j->>'volunteers')::int from fn_w) = (select count(*) from public.profiles where role='volunteer'),
    'active_campaigns',      (select (j->>'active_campaigns')::int from fn_w) = (select count(*) from public.campaigns where status='active'),
    'buckets_weekly',        (select j->'contribution_buckets' from fn_w) = (select j from ref_w),
    'buckets_monthly',       (select j->'contribution_buckets' from fn_m) = (select j from ref_m),
    'buckets_daily',         (select j->'contribution_buckets' from fn_d) = (select j from ref_d),
    'contributor_growth_weekly', (select j from fn_cg) = (select j from ref_cg),
    'campaign_count',        (select jsonb_array_length(j->'campaigns') from fn_w) = (select count(*) from public.campaigns),
    'status_counts_sum_equals_assigned', (select (j->'status_counts'->>'Active')::int + (j->'status_counts'->>'Due')::int + (j->'status_counts'->>'Overdue')::int + (j->'status_counts'->>'Inactive')::int from fn_w) = (select count(distinct contributor_id) from public.contributor_assignments)
  ),
  'new_function_output', jsonb_build_object(
    'total_raised', (select j->'total_raised' from fn_w),
    'status_counts', (select j->'status_counts' from fn_w)
  ),
  'old_page_visibility', jsonb_build_object(
    'true_rows_success_contributions', (select count(*) from public.contributions where status='success'),
    'old_rows_visible', (select least(count(*), 1000) from public.contributions where status='success'),
    'old_total_approx_first_1000', (select coalesce(sum(amount),0) from (select amount from public.contributions where status='success' limit 1000) s),
    'true_total', (select coalesce(sum(amount),0) from public.contributions where status='success')
  )
)) as comparison;
