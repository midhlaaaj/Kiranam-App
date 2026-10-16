-- Monthly Kiranam reminders (3 days before, on, and 3 days after the due
-- date) are sent by the daily /api/cron/kiranam-reminders job. One row per
-- (contributor, kind, due date) is claimed *before* sending, so a retried
-- or double-fired cron run can never send the same reminder twice.

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('upcoming', 'due_today', 'overdue')),
  due_date date not null,
  sent_at timestamptz not null default now(),
  unique (profile_id, kind, due_date)
);

-- Written and read only by the service role (the cron route).
alter table public.reminder_log enable row level security;

-- The cron job looks commitments up by due date every day.
create index if not exists idx_commitments_next_due_date on public.commitments (next_due_date);

-- The new reminder job sends the "3 days before" reminder (push + WhatsApp
-- + email), so drop that block from the existing daily pg_cron checks to
-- avoid a duplicate push. Everything else is unchanged.
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
  -- Autopay heads-up: 1 day before it actually charges.
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

  -- Newly-overdue contributor → notify their assigned volunteer(s), once,
  -- the day it first lapses (not every day it stays overdue).
  for v_row in
    select c.contributor_id, p.full_name from public.commitments c
    join public.profiles p on p.id = c.contributor_id
    where c.autopay_enabled = false and c.next_due_date = current_date - 1
  loop
    for v_assignment in select volunteer_id from public.contributor_assignments where contributor_id = v_row.contributor_id loop
      perform public.notify(
        v_assignment.volunteer_id,
        'Contributor payment overdue',
        coalesce(v_row.full_name, 'One of your contributors') || '''s monthly contribution is now overdue.',
        'system',
        '/(volunteer-tabs)/contributors'
      );
    end loop;
  end loop;

  -- Monthly giving summary for volunteers — only fires on the 1st.
  if extract(day from current_date) = 1 then
    for v_row in
      select
        ca.volunteer_id,
        coalesce(sum(c.amount), 0) as total
      from public.contributor_assignments ca
      join public.contributions c on c.contributor_id = ca.contributor_id
        and c.status = 'success'
        and c.created_at >= date_trunc('month', current_date) - interval '1 month'
        and c.created_at < date_trunc('month', current_date)
      group by ca.volunteer_id
      having coalesce(sum(c.amount), 0) > 0
    loop
      perform public.notify(
        v_row.volunteer_id,
        'Your monthly giving summary',
        'Your contributors gave ₹' || v_row.total || ' last month. Thank you for your work!',
        'system',
        '/(volunteer-tabs)/dashboard'
      );
    end loop;
  end if;
end;
$function$;
