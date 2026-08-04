-- The original schema (20260710000001_schema.sql) constrained
-- contributions.status to only 'success'/'failed'. Real Razorpay payments
-- are inserted as 'pending' by the create-razorpay-order Edge Function and
-- later updated to 'success' by verify-razorpay-payment (see
-- 20260804000003_bump_campaign_raised_on_status_update.sql, which already
-- assumes 'pending' rows exist) — this constraint was widened live to match,
-- but never had a tracked migration until now. Adding it here so a clean
-- `supabase db push` reproduces the actual running schema.

alter table public.contributions drop constraint if exists contributions_status_check;
alter table public.contributions add constraint contributions_status_check
  check (status = any (array['success', 'failed', 'pending']));
