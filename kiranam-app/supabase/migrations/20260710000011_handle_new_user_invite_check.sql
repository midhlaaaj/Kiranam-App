-- Extends the existing signup trigger: if the new user's email matches an
-- unused admin_invites row, promote their profile to role='admin' and mark
-- the invite used, atomically (same security-definer trigger as before).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  matched_email text;
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;

  if new.email is not null then
    update public.admin_invites
    set used_at = now()
    where lower(email) = lower(new.email) and used_at is null
    returning email into matched_email;

    if matched_email is not null then
      update public.profiles set role = 'admin' where id = new.id;
    end if;
  end if;

  return new;
end;
$$;
