-- ============================================================
-- Manual/offline payment support on contributions.
--
-- Lets an admin record a cash/offline payment a volunteer collected
-- from a contributor, distinct from real Razorpay payments. Existing
-- triggers (bump_campaign_raised) read only id/amount/campaign_id/
-- status, so they keep working unmodified against rows carrying
-- these new columns.
-- ============================================================

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS is_offline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS collected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note text;

CREATE INDEX IF NOT EXISTS idx_contributions_is_offline
  ON public.contributions(is_offline)
  WHERE is_offline = true;
