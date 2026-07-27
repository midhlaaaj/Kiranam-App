-- Additional gallery images for campaigns/events, beyond the single
-- cover_image_url column each table already has.

create table if not exists public.campaign_images (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.campaign_images enable row level security;
alter table public.event_images enable row level security;

create policy "campaign_images_select_all" on public.campaign_images for select
  using (true);
create policy "campaign_images_write_admin" on public.campaign_images for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "event_images_select_all" on public.event_images for select
  using (true);
create policy "event_images_write_admin" on public.event_images for all
  using (public.is_admin())
  with check (public.is_admin());
