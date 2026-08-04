-- Self-heals both completion conditions (end date passed, goal reached) in
-- one call, so the admin campaigns list stays consistent with the app's own
-- client-side derivation (which already checks both) rather than only the
-- date, which the list page previously self-healed on its own.
create or replace function public.self_heal_campaign_completion()
returns void as $$
begin
  update public.campaigns
  set status = 'completed'
  where status <> 'completed'
    and (end_date < current_date or raised >= goal);
end;
$$ language plpgsql;
