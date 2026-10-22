-- Dashboard aggregates computed in the database instead of in the page.
--
-- The Overview page used to select every successful contribution, every
-- volunteer, every assignment and every commitment and sum/bucket them in
-- JavaScript. PostgREST silently caps a response at its max_rows setting
-- (1000 by default), so past that size the totals were computed from an
-- arbitrary subset. These functions aggregate in SQL, so they are exact and
-- the payload is a few KB regardless of table size.
--
-- Both are SECURITY INVOKER: they run with the caller's RLS, so an admin sees
-- exactly the rows the old page queries saw and nobody gains access to anything
-- new. No policy is changed. Bucket keys match src/lib/timeBuckets.ts
-- (daily/weekly 'YYYY-MM-DD' with weeks starting Monday, monthly 'YYYY-MM'), in
-- the time zone passed by the caller, so the page's existing label/paging code
-- keeps working unchanged.

create or replace function public.dashboard_overview(
  p_granularity text default 'weekly',
  p_tz text default 'UTC'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public'
as $$
declare
  v_unit text;
  v_fmt text;
begin
  v_unit := case p_granularity when 'daily' then 'day' when 'weekly' then 'week' when 'monthly' then 'month' end;
  if v_unit is null then
    raise exception 'invalid granularity: %', p_granularity;
  end if;
  v_fmt := case when v_unit = 'month' then 'YYYY-MM' else 'YYYY-MM-DD' end;

  return jsonb_build_object(
    'pending_applications', (select count(*) from public.volunteer_applications where status = 'pending'),
    'contributors',         (select count(*) from public.profiles where role = 'contributor' and phone is not null),
    'volunteers',           (select count(*) from public.profiles where role = 'volunteer'),
    'active_campaigns',     (select count(*) from public.campaigns where status = 'active'),
    'total_raised',         (select coalesce(sum(amount), 0) from public.contributions where status = 'success'),
    'contribution_buckets', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t) order by k), '[]'::jsonb)
      from (
        select to_char(date_trunc(v_unit, created_at at time zone p_tz), v_fmt) as k, sum(amount) as t
        from public.contributions where status = 'success'
        group by 1
      ) b
    ),
    'campaigns', (
      select coalesce(jsonb_agg(jsonb_build_object('title', title, 'raised', raised, 'goal', goal) order by created_at), '[]'::jsonb)
      from public.campaigns
    ),
    'volunteer_monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by k), '[]'::jsonb)
      from (
        select to_char(date_trunc('month', created_at at time zone p_tz), 'YYYY-MM') as k, count(*) as c
        from public.profiles where role = 'volunteer'
        group by 1
      ) v
    ),
    -- Mirrors deriveContributorStatus() in src/lib/volunteerStats.ts for each
    -- distinct assigned contributor. next_due_date is a date, which JS parses
    -- as UTC midnight, hence the explicit UTC conversion.
    'status_counts', (
      select jsonb_build_object(
        'Active',   count(*) filter (where s = 'active'),
        'Due',      count(*) filter (where s = 'due'),
        'Overdue',  count(*) filter (where s = 'overdue'),
        'Inactive', count(*) filter (where s = 'inactive')
      )
      from (
        select case
          when c.contributor_id is null or c.autopay_enabled is not true then 'inactive'
          when c.next_due_date is null then 'active'
          when extract(epoch from ((c.next_due_date::timestamp at time zone 'UTC') - now())) / 86400 < 0 then 'overdue'
          when extract(epoch from ((c.next_due_date::timestamp at time zone 'UTC') - now())) / 86400 <= 7 then 'due'
          else 'active'
        end as s
        from (select distinct contributor_id from public.contributor_assignments) a
        left join public.commitments c on c.contributor_id = a.contributor_id
      ) x
    )
  );
end;
$$;

revoke all on function public.dashboard_overview(text, text) from public, anon;
grant execute on function public.dashboard_overview(text, text) to authenticated, service_role;

-- New contributors per bucket (the page accumulates them into the running total).
create or replace function public.dashboard_contributor_growth(
  p_granularity text default 'weekly',
  p_tz text default 'UTC'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public'
as $$
declare
  v_unit text;
  v_fmt text;
begin
  v_unit := case p_granularity when 'daily' then 'day' when 'weekly' then 'week' when 'monthly' then 'month' end;
  if v_unit is null then
    raise exception 'invalid granularity: %', p_granularity;
  end if;
  v_fmt := case when v_unit = 'month' then 'YYYY-MM' else 'YYYY-MM-DD' end;

  return (
    select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by k), '[]'::jsonb)
    from (
      select to_char(date_trunc(v_unit, created_at at time zone p_tz), v_fmt) as k, count(*) as c
      from public.profiles
      where role = 'contributor' and phone is not null
      group by 1
    ) g
  );
end;
$$;

revoke all on function public.dashboard_contributor_growth(text, text) from public, anon;
grant execute on function public.dashboard_contributor_growth(text, text) to authenticated, service_role;
