-- ============================================================
-- KK Number
--
-- ~1500-2000 existing contributors already have a "KK number"
-- (KK1, KK2, ...) assigned manually outside this system. This adds
-- a column to record it. The "auto-assign KK number on new
-- contributor" toggle used by the Settings page and Register
-- Contributor form reuses the existing key/value `app_settings`
-- table (see 020_razorpay_recurring_autopay.sql) rather than a new
-- table — that table already exists with RLS blocking all non-
-- service-role access, so app code reads/writes it via the admin
-- (service-role) client, same as its existing Razorpay-plan-cache use.
-- ============================================================

alter table public.profiles add column if not exists kk_number text;

-- Case-insensitive uniqueness (so "kk5" and "KK5" can't both exist)
-- without forcing stored values to a particular case.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where indexname = 'profiles_kk_number_unique_idx'
  ) then
    create unique index profiles_kk_number_unique_idx
      on public.profiles (lower(kk_number))
      where kk_number is not null;
  end if;
end $$;

insert into public.app_settings (key, value)
values ('auto_assign_kk_number', 'false')
on conflict (key) do nothing;
