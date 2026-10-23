-- whatsapp_config was left on the old single-owner policy (auth.uid() = user_id)
-- when 008 moved the other WhatsApp tables to account-based access. The app
-- reads and writes this row by account_id (one row per account), so every
-- admin except the one who first saved it saw no row at all: the inbox showed
-- "WhatsApp is not connected", Settings showed "Not Connected", and their
-- inbox replies, broadcasts, template sync/submit, sending limits, usage,
-- media and reactions failed the same way. Same rules as 008: any account
-- member can read, admin+ can change it (the API routes already require admin
-- for save/reset). Receipts, reminders, campaign alerts, the OTP hook and the
-- webhook use the service role and were never affected.

drop policy "Users can manage own config" on public.whatsapp_config;
create policy "whatsapp_config_select" on public.whatsapp_config for select using (is_account_member(account_id));
create policy "whatsapp_config_insert" on public.whatsapp_config for insert with check (is_account_member(account_id, 'admin'));
create policy "whatsapp_config_update" on public.whatsapp_config for update using (is_account_member(account_id, 'admin'));
create policy "whatsapp_config_delete" on public.whatsapp_config for delete using (is_account_member(account_id, 'admin'));
