-- Seed data so the app has real campaigns/events to show immediately after
-- Phase 2 switches the mobile app over from mock state to live Supabase queries.
-- Contributions/notifications/commitments are intentionally NOT seeded here —
-- those are per-user and should start empty for real accounts.

insert into public.campaigns (title, description, goal, raised, status)
values
  ('Clean Water for Wayanad', 'Providing clean drinking water access to rural Wayanad communities.', 250000, 186400, 'active'),
  ('School Kit Fund', 'Backpacks, books, and stationery for underprivileged students.', 150000, 92500, 'active'),
  ('Winter Blanket Distribution Drive', 'Distributing woollen blankets to elderly residents and children across rural Kerala.', 400000, 340000, 'active'),
  ('Elder Care Nutrition Program', 'Monthly nutrition support for elderly residents in care homes.', 120000, 58000, 'active'),
  ('Flood Relief — Wayanad', 'Emergency relief supplies for families displaced by flooding.', 500000, 500000, 'completed'),
  ('Girl Child Education Fund', 'Scholarships and school supplies for girl children.', 275000, 275000, 'completed')
on conflict do nothing;

insert into public.events (title, description, event_date, time_label, location, is_past)
values
  ('Winter Blanket Distribution Drive', 'Join volunteers to distribute blankets to elderly residents and children across rural Wayanad communities.', '2026-07-18', '9:00 AM – 1:00 PM', 'Wayanad Community Hall', false),
  ('Contributor Meet & Volunteer Orientation', 'Meet fellow contributors, share feedback, and get an orientation on volunteer opportunities.', '2026-08-02', '4:00 PM – 6:00 PM', 'Kochi Marine Drive', false),
  ('School Kit Fund — Handover Ceremony', 'Handover ceremony of study kits (backpacks, books, stationery) purchased through school kit fund.', '2026-08-15', '10:00 AM', 'Government HS, Kannur', true),
  ('Flood Relief Volunteer Day', 'Over 40 contributors and volunteers joined hands to pack and distribute emergency relief kits to families displaced by the Chalakudy floods.', '2026-06-20', '8:00 AM – 3:00 PM', 'Chalakudy Relief Camp, Thrissur', true)
on conflict do nothing;
