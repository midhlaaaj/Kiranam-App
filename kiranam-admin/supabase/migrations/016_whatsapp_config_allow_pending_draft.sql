-- Lets a WhatsApp config row be saved before the permanent access token is
-- in hand (e.g. phone_number_id + webhook verify_token gathered first,
-- token added in a later save once generated in Meta Business Suite).
-- Nothing about Meta verification is weakened — it's still required and
-- run whenever a real token IS provided; this only allows an interim
-- "pending" state to exist instead of blocking the save entirely.
alter table public.whatsapp_config alter column access_token drop not null;

alter table public.whatsapp_config drop constraint whatsapp_config_status_check;
alter table public.whatsapp_config add constraint whatsapp_config_status_check
  check (status = any (array['connected', 'disconnected', 'pending']));
