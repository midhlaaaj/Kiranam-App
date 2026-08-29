-- Lets an admin attach an optional reason when rejecting a volunteer
-- application, surfaced on the app's dedicated rejection screen. Also
-- deep-links the rejection push notification straight to that screen,
-- mirroring the approval branch's existing dashboard deep link.

alter table public.volunteer_applications
  add column if not exists rejection_reason text;

create or replace function public.trg_notify_application_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.notify(new.profile_id, 'You''re now a Kiranam volunteer!', 'Your volunteer application was approved — welcome aboard.', 'system', '/(volunteer-tabs)/dashboard');
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    perform public.notify(new.profile_id, 'Volunteer application update', 'Your volunteer application wasn''t approved this time.', 'system', '/volunteer-rejected');
  end if;
  return new;
end;
$function$;
