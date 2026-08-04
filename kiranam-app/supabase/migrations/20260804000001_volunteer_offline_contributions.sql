-- Lets a volunteer record an offline monthly/campaign contribution on behalf
-- of a contributor assigned to them (mirrors the admin's manual offline
-- payment flow). Restricted to is_offline rows they mark as collected by
-- themselves, so a volunteer can't backdate/impersonate a real gateway
-- payment or attribute collection to someone else.
--
-- IMPORTANT: this must preserve the `status <> 'success'` restriction on the
-- contributor's own self-insert case (added by
-- kiranam-admin/supabase/migrations/010_harden_razorpay_payment_flow.sql) —
-- an earlier version of this migration dropped it by accident, which would
-- have let any contributor insert a fake 'success' row directly, bypassing
-- Razorpay verification entirely. Do not remove that clause again.
drop policy if exists "contributions_insert" on public.contributions;
create policy "contributions_insert" on public.contributions for insert
  with check (
    (contributor_id = auth.uid() and status <> 'success')
    or public.is_admin()
    or (
      public.is_assigned_volunteer(contributor_id)
      and is_offline = true
      and status = 'success'
      and collected_by = auth.uid()
    )
  );
