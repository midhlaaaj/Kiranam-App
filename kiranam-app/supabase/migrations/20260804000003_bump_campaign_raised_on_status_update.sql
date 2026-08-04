-- The original on_contribution_bump_campaign trigger only fired AFTER INSERT.
-- Real Razorpay contributions are inserted with status='pending' and later
-- UPDATEd to status='success' by the verify-razorpay-payment edge function,
-- so campaigns.raised was never actually incremented for gateway payments —
-- the app only looked updated because of an optimistic client-side bump that
-- got reverted on the next refetch. Add an AFTER UPDATE trigger covering the
-- pending -> success transition, using the same bump_campaign_raised() function.

drop trigger if exists on_contribution_bump_campaign_update on public.contributions;
create trigger on_contribution_bump_campaign_update
  after update on public.contributions
  for each row
  when (old.status is distinct from 'success' and new.status = 'success')
  execute procedure public.bump_campaign_raised();
