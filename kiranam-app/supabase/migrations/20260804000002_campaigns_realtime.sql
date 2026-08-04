-- Let clients subscribe to live campaign changes (raised amount, status)
-- so progress bars update the instant a contribution lands, for every
-- viewer, without a manual refresh or waiting on the app's foreground poll.
alter publication supabase_realtime add table public.campaigns;
