-- Counts login codes (WhatsApp OTPs) sent, so Settings -> WhatsApp -> Sending
-- limits can show real usage and broadcasts can keep enough of the daily
-- allowance free for them. Stores only a hash of the phone number (to count
-- distinct people) and the time; rows older than 3 days are pruned on write.
create table if not exists public.otp_send_log (
  id bigint generated always as identity primary key,
  phone_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists otp_send_log_created_at_idx on public.otp_send_log (created_at);
alter table public.otp_send_log enable row level security; -- no policies: only the functions below touch it

create or replace function public.log_otp_send(p_phone text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.otp_send_log (phone_hash) values (md5(regexp_replace(p_phone, '\D', '', 'g')));
  delete from public.otp_send_log where created_at < now() - interval '3 days';
end;
$$;
revoke all on function public.log_otp_send(text) from public, anon, authenticated;
grant execute on function public.log_otp_send(text) to service_role;

-- Distinct people who were sent a login code in the last 24 hours.
create or replace function public.otp_recipients_last_24h()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(distinct phone_hash)::int from public.otp_send_log where created_at > now() - interval '24 hours';
$$;
revoke all on function public.otp_recipients_last_24h() from public, anon;
grant execute on function public.otp_recipients_last_24h() to authenticated, service_role;
