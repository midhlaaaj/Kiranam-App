-- Archiving is an alternative to deleting: a campaign with real donation
-- history can be taken off the active list without losing the campaign
-- record itself (goal, images, per-campaign totals) the way an outright
-- delete would. Kept as a separate boolean rather than folded into `status`
-- so self_heal_campaign_completion()'s active/completed logic (and the
-- mobile app's own status handling) doesn't need to account for a third
-- state.
alter table public.campaigns
  add column if not exists archived boolean not null default false;
