-- "Pause Contributions" — a separate, heavier action than turning autopay
-- off: it also stops WhatsApp broadcasts reaching this contributor (via a
-- "Paused" tag on their linked wacrm contact, enforced unconditionally in
-- broadcast audience resolution — not an opt-in exclude filter, so pausing
-- is an actual guarantee rather than something an admin has to remember
-- per broadcast) until they explicitly resume.

alter table public.commitments
  add column if not exists contribution_paused boolean not null default false;
