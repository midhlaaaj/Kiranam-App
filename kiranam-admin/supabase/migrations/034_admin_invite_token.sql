-- Admin invites are now claimed with a secret, one-time code in the emailed
-- link (/signup?token=...) instead of by typing the invited email address.
-- Only a SHA-256 hash of the code is stored, so a database read can't be
-- turned into working sign-up links. The code is cleared once used, and a
-- resend replaces it (the old link stops working).

alter table public.admin_invites
  add column if not exists token_hash text;

create unique index if not exists admin_invites_token_hash_key
  on public.admin_invites (token_hash)
  where token_hash is not null;
