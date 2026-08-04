-- Real persistence for volunteer notes on a contributor (previously local-
-- state-only in volunteer-contributor-detail.tsx — notes vanished the
-- moment the volunteer navigated away, despite looking saved).
create table public.contributor_notes (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.profiles(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.contributor_notes enable row level security;

create policy "contributor_notes_select" on public.contributor_notes for select
  using (
    (is_assigned_volunteer(contributor_id) and volunteer_id = auth.uid())
    or is_admin()
  );

create policy "contributor_notes_insert" on public.contributor_notes for insert
  with check (
    is_assigned_volunteer(contributor_id) and volunteer_id = auth.uid()
  );
