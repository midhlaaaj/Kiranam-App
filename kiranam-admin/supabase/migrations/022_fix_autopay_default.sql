-- commitments.autopay_enabled defaulted to true from its original schema
-- (back when it was just a reminder-copy preference, not a real mandate
-- flag) — since the recurring-autopay migration, true is only ever
-- supposed to mean "a live, authorized Razorpay subscription exists."
-- Every existing row with autopay_enabled=true but no subscription id
-- was never actually authorized, so the Profile screen showed "Turn off
-- Autopay" for something that was never on, and tapping it correctly
-- failed (there's nothing on Razorpay's side to cancel).

update public.commitments
  set autopay_enabled = false
  where autopay_enabled = true and razorpay_subscription_id is null;

alter table public.commitments
  alter column autopay_enabled set default false;
