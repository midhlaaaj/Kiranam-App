-- Announcements (notifications with category = 'broadcast') are one row per
-- recipient, so a single send to everyone adds a row per person. Nothing needs
-- them after a month — the Sent list reads from admin_audit_log, which is kept —
-- so delete them daily to keep the notifications table small.
--
-- Scope is deliberately narrow: ONLY category = 'broadcast', ONLY older than
-- 30 days. Personal notifications (payment due, application approved, etc.)
-- are untouched.

CREATE OR REPLACE FUNCTION public.purge_old_announcements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.notifications
  WHERE category = 'broadcast'
    AND created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Not callable from the app — only the scheduler (a superuser role) runs it.
REVOKE ALL ON FUNCTION public.purge_old_announcements() FROM PUBLIC, anon, authenticated;

-- Speeds the daily delete (and is harmless if it already exists).
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast_created_at
  ON public.notifications (created_at)
  WHERE category = 'broadcast';

-- Schedule it daily at 03:00 UTC (08:30 IST) if pg_cron is available.
-- Supabase: enable it under Database → Extensions, then re-run this block.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-old-announcements';
    PERFORM cron.schedule('purge-old-announcements', '0 3 * * *', 'SELECT public.purge_old_announcements();');
  ELSE
    RAISE NOTICE 'pg_cron is not available — enable it in Database → Extensions, then re-run this migration.';
  END IF;
END $$;
