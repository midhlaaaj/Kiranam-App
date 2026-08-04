-- 1. Prevent double-counting: bump_campaign_raised is shared by an INSERT
--    trigger and an UPDATE trigger. On UPDATE it only checked NEW.status,
--    so re-saving an already-successful row (status unchanged) would add
--    the amount to the campaign total a second time.
CREATE OR REPLACE FUNCTION public.bump_campaign_raised()
RETURNS trigger AS $$
begin
  if new.campaign_id is not null and new.status = 'success'
     and (tg_op = 'INSERT' or old.status is distinct from 'success') then
    update public.campaigns
    set raised = raised + new.amount,
        status = case when raised + new.amount >= goal then 'completed' else status end
    where id = new.campaign_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- 2. Close the fake-payment hole: now that real payments are recorded via
--    the verify-razorpay-payment Edge Function (service role, only after a
--    verified HMAC signature), a contributor no longer needs — and must
--    not have — permission to insert a 'success' row directly from the
--    client. Admin-recorded offline payments (which go through the admin's
--    own is_admin()-gated session) are unaffected.
drop policy "contributions_insert" on public.contributions;
create policy "contributions_insert" on public.contributions
  for insert
  with check ((contributor_id = auth.uid() and status <> 'success') or is_admin());
