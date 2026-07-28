-- Add an end date to campaigns so they can auto-complete once it passes,
-- and make the raised-amount trigger also flip status to 'completed'
-- once the goal is fully reached (previously only bumped the raised total).

alter table public.campaigns add column if not exists end_date date;

create or replace function public.bump_campaign_raised()
returns trigger as $$
begin
  if new.campaign_id is not null and new.status = 'success' then
    update public.campaigns
    set raised = raised + new.amount,
        status = case when raised + new.amount >= goal then 'completed' else status end
    where id = new.campaign_id;
  end if;
  return new;
end;
$$ language plpgsql;
