-- Real recurring autopay via Razorpay Subscriptions. Adds mandate-tracking
-- columns to commitments, formally declares the razorpay_order_id/
-- razorpay_payment_id columns on contributions that the existing
-- create-razorpay-order/verify-razorpay-payment Edge Functions already
-- write to live but which were never captured in a tracked migration, and
-- adds the unique index the new webhook's idempotent insert depends on
-- (a Razorpay webhook retry must never be able to double-insert a charge).
--
-- app_settings is a tiny key/value table used to lazily create-and-cache
-- the single reusable Razorpay Plan (see create-razorpay-subscription) —
-- avoids needing a new Supabase Edge Function secret provisioned outside
-- this migration.

alter table public.contributions
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;

create unique index if not exists contributions_razorpay_payment_id_key
  on public.contributions (razorpay_payment_id)
  where razorpay_payment_id is not null;

alter table public.commitments
  add column if not exists razorpay_subscription_id text,
  add column if not exists razorpay_plan_id text,
  add column if not exists mandate_status text;

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Only service-role (Edge Functions) ever reads/writes this — no client-
-- facing policy needed, so RLS with no policies blocks all client access
-- by default while service-role (which bypasses RLS) still works.
