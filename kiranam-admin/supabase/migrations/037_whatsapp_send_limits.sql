-- Daily WhatsApp sending limits, editable in Settings -> WhatsApp.
--   daily_send_cap     max unique people messaged per rolling 24h (NULL = no cap)
--   daily_reserve      headroom kept free for login OTPs, reminders and replies,
--                      which are sent outside broadcasts and not counted by us
--   auto_resume        keep sending a queued broadcast on its own (cron)
--   meta_limit_tier    last tier read from Meta (e.g. TIER_2K) and when
-- A broadcast that hit the cap is 'queued' until the rest can go out.
alter table public.whatsapp_config
  add column if not exists daily_send_cap integer default 2000 check (daily_send_cap is null or daily_send_cap >= 0),
  add column if not exists daily_reserve integer not null default 200 check (daily_reserve >= 0),
  add column if not exists auto_resume boolean not null default false,
  add column if not exists meta_limit_tier text,
  add column if not exists meta_limit_checked_at timestamptz;

alter table public.broadcasts drop constraint if exists broadcasts_status_check;
alter table public.broadcasts
  add constraint broadcasts_status_check
  check (status = any (array['draft','scheduled','sending','sent','failed','queued']));
