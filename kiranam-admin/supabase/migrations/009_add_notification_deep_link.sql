-- Lets a notification carry an optional in-app route to navigate to on tap
-- (e.g. a failed payment notification linking straight to retry-payment).
-- Purely informational notifications (welcome, deletion confirmation, etc.)
-- simply leave this null.

alter table public.notifications add column if not exists deep_link text;
