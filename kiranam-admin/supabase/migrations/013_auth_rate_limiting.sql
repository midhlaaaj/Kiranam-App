-- DB-backed rate limiter for admin login and OTP-send requests — persists
-- across restarts and works correctly across multiple instances, unlike the
-- existing in-memory limiter (kiranam-admin/src/lib/whatsapp/rate-limit.ts),
-- which is explicitly documented there as single-instance only.
--
-- Service-role only: RLS is enabled with no policies (default-deny), since
-- only server-side code (the login action, the send-sms hook, both using
-- the service-role client) should ever touch this table.
create table public.auth_rate_limits (
  key text primary key,
  attempt_count int not null default 1,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.auth_rate_limits enable row level security;

create or replace function public.check_and_record_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int,
  p_lockout_seconds int
) returns table(allowed boolean, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.auth_rate_limits;
  v_now timestamptz := now();
begin
  select * into v_row from public.auth_rate_limits where key = p_key for update;

  if v_row.key is null then
    insert into public.auth_rate_limits (key, attempt_count, window_start)
    values (p_key, 1, v_now);
    return query select true, 0;
    return;
  end if;

  if v_row.locked_until is not null and v_row.locked_until > v_now then
    return query select false, ceil(extract(epoch from (v_row.locked_until - v_now)))::int;
    return;
  end if;

  if v_row.window_start + (p_window_seconds || ' seconds')::interval < v_now then
    update public.auth_rate_limits set attempt_count = 1, window_start = v_now, locked_until = null where key = p_key;
    return query select true, 0;
    return;
  end if;

  if v_row.attempt_count < p_limit then
    update public.auth_rate_limits set attempt_count = attempt_count + 1 where key = p_key;
    return query select true, 0;
    return;
  end if;

  update public.auth_rate_limits
    set locked_until = v_now + (p_lockout_seconds || ' seconds')::interval
    where key = p_key;
  return query select false, p_lockout_seconds;
end;
$$;

-- Called after a successful login so a legitimate user isn't left partway
-- through a lockout window from earlier mistyped attempts.
create or replace function public.reset_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.auth_rate_limits where key = p_key;
$$;
