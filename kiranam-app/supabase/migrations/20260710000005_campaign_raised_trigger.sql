-- Contributors can only INSERT into contributions (see contributions_insert policy) —
-- they cannot UPDATE campaigns directly (campaigns_write_admin is admin-only).
-- This trigger runs as the function owner (security definer), bypassing RLS,
-- so a successful contribution towards a campaign still bumps its raised total.

create or replace function public.bump_campaign_raised()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.campaign_id is not null and new.status = 'success' then
    update public.campaigns
    set raised = raised + new.amount
    where id = new.campaign_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_contribution_bump_campaign on public.contributions;
create trigger on_contribution_bump_campaign
  after insert on public.contributions
  for each row execute procedure public.bump_campaign_raised();
