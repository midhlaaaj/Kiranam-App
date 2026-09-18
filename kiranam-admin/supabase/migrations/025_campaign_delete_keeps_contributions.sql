-- Deleting a campaign was blocked outright ("update or delete on table
-- campaigns violates foreign key constraint contributions_campaign_id_fkey")
-- whenever it had any contributions attached, since the FK's delete rule was
-- NO ACTION. Keeping every campaign forever just to satisfy that isn't
-- practical — contributions should survive a campaign's deletion instead of
-- blocking it. contributions.label already carries a human-readable
-- "Campaign: <title>" snapshot recorded at donation time (see
-- addOfflinePayment / the app's own contribution flow), so the donation's
-- campaign attribution isn't lost even once campaign_id is nulled out.

alter table public.contributions
  drop constraint contributions_campaign_id_fkey;

alter table public.contributions
  add constraint contributions_campaign_id_fkey
    foreign key (campaign_id) references public.campaigns(id) on delete set null;
