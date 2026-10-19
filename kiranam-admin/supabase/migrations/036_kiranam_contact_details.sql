-- Kiranam details for WhatsApp broadcast personalisation ("Fill with: From
-- each contact's details"). One row per synced contact: KK number, monthly
-- commitment, next due date, autopay state, last successful payment and
-- lifetime total. SECURITY INVOKER, so it only returns what the caller's
-- row-level security already lets them read (admins see everyone).
create or replace function public.kiranam_contact_details(contact_ids uuid[])
returns table (
  contact_id uuid,
  kk_number text,
  profile_email text,
  monthly_amount numeric,
  next_due_date date,
  autopay_enabled boolean,
  last_payment_date timestamptz,
  total_contributed numeric
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    c.id,
    p.kk_number,
    p.email,
    cm.monthly_amount,
    cm.next_due_date,
    cm.autopay_enabled,
    (select max(x.created_at) from public.contributions x where x.contributor_id = p.id and x.status = 'success'),
    (select coalesce(sum(x.amount), 0) from public.contributions x where x.contributor_id = p.id and x.status = 'success')
  from public.contacts c
  join public.profiles p on p.id = c.kiranam_profile_id
  left join public.commitments cm on cm.contributor_id = p.id
  where c.id = any (contact_ids);
$$;
