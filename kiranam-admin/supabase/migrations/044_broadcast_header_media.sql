-- ============================================================
-- 044_broadcast_header_media.sql
--
-- A broadcast whose template has an image/video/document header needs that
-- media URL on every send. It was only held in the browser, so "Retry failed"
-- and "Send remaining" re-sent without it and every retry failed with
-- "image header requires a media link". Keep it on the broadcast so a retry
-- uses the same file.
-- ============================================================

alter table public.broadcasts
  add column if not exists header_media_url text;
