-- SQL Seed Script to populate the Kiranam database with dummy data
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new)

-- 1. Promote midhlajmidhu004@gmail.com to Admin (so you can log in immediately)
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'midhlajmidhu004@gmail.com';

-- 2. Clean up any previous dummy users to avoid primary key conflicts
DELETE FROM public.commitments WHERE contributor_id IN (
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008'
);
DELETE FROM public.contributions WHERE contributor_id IN (
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008'
);
DELETE FROM public.contributor_assignments WHERE volunteer_id IN (
  'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004'
) OR contributor_id IN (
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008'
);
DELETE FROM public.volunteer_applications WHERE profile_id IN (
  'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000003'
);
DELETE FROM public.profiles WHERE id IN (
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008',
  'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000003'
);
DELETE FROM auth.users WHERE email LIKE 'dummy.%';

-- 3. Insert Contributors into auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'dummy.donor1@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002', 'dummy.donor2@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003', 'dummy.donor3@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000004', 'dummy.donor4@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000005', 'dummy.donor5@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000006', 'dummy.donor6@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000007', 'dummy.donor7@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000008', 'dummy.donor8@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated');

-- 4. Insert Volunteers into auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'dummy.vol1@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000002', 'dummy.vol2@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000003', 'dummy.vol3@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000004', 'dummy.vol4@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated');

-- 5. Insert Pending Volunteer Applicants into auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'dummy.app1@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000002', 'dummy.app2@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000003', 'dummy.app3@kiranam.org', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated');

-- 6. Configure Profile Details (Trigger handle_new_user automatically inserted rows, we now customize them)
UPDATE public.profiles SET full_name = 'Arjun Mehta', role = 'contributor', created_at = now() - interval '90 days' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Priya Nair', role = 'contributor', created_at = now() - interval '80 days' WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET full_name = 'Rohan Das', role = 'contributor', created_at = now() - interval '70 days' WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET full_name = 'Ananya Sen', role = 'contributor', created_at = now() - interval '60 days' WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE public.profiles SET full_name = 'Vikram Rao', role = 'contributor', created_at = now() - interval '50 days' WHERE id = 'a0000000-0000-0000-0000-000000000005';
UPDATE public.profiles SET full_name = 'Sneha Patel', role = 'contributor', created_at = now() - interval '40 days' WHERE id = 'a0000000-0000-0000-0000-000000000006';
UPDATE public.profiles SET full_name = 'Kabir Singh', role = 'contributor', created_at = now() - interval '30 days' WHERE id = 'a0000000-0000-0000-0000-000000000007';
UPDATE public.profiles SET full_name = 'Diya Bose', role = 'contributor', created_at = now() - interval '20 days' WHERE id = 'a0000000-0000-0000-0000-000000000008';

UPDATE public.profiles SET full_name = 'Karan Johar', role = 'volunteer', created_at = now() - interval '100 days' WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Aditi Rao', role = 'volunteer', created_at = now() - interval '85 days' WHERE id = 'b0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET full_name = 'Vijay Kumar', role = 'volunteer', created_at = now() - interval '50 days' WHERE id = 'b0000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET full_name = 'Maya Ali', role = 'volunteer', created_at = now() - interval '25 days' WHERE id = 'b0000000-0000-0000-0000-000000000004';

UPDATE public.profiles SET full_name = 'Amit Sharma', role = 'contributor', created_at = now() - interval '5 days' WHERE id = 'c0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Neha Gupta', role = 'contributor', created_at = now() - interval '3 days' WHERE id = 'c0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET full_name = 'Rahul Verma', role = 'contributor', created_at = now() - interval '1 days' WHERE id = 'c0000000-0000-0000-0000-000000000003';

-- 7. Insert Volunteer Applications
INSERT INTO public.volunteer_applications (id, profile_id, motivation, status, created_at)
VALUES
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'I want to help Wayanad communities access clean water.', 'approved', now() - interval '100 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', 'I love teaching children and helping distribute school kits.', 'approved', now() - interval '85 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', 'Interested in elder care and disaster relief.', 'approved', now() - interval '50 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', 'Ready to assist with blanket distribution and local events.', 'approved', now() - interval '25 days'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'Would like to volunteer on weekends.', 'pending', now() - interval '5 days'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000002', 'Passionate about charity and social service.', 'pending', now() - interval '3 days'),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003', 'I can assist with tech or operational tasks.', 'pending', now() - interval '1 days');

-- 8. Insert Contributor-Volunteer Assignments (Required for Status Breakdown logic)
INSERT INTO public.contributor_assignments (id, volunteer_id, contributor_id, assigned_at)
VALUES
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', now() - interval '80 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', now() - interval '80 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', now() - interval '60 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', now() - interval '60 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', now() - interval '40 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006', now() - interval '40 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', now() - interval '20 days'),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', now() - interval '20 days');

-- 9. Insert Commitments
INSERT INTO public.commitments (id, contributor_id, monthly_amount, autopay_enabled, next_due_date)
VALUES
  -- Active
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 1500, true, current_date + interval '15 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 2000, true, current_date + interval '20 days'),
  -- Due (in <= 7 days)
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 1000, true, current_date + interval '3 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', 500, true, current_date + interval '4 days'),
  -- Overdue (in the past)
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', 3000, true, current_date - interval '2 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', 1500, true, current_date - interval '5 days'),
  -- Inactive
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000007', 1200, false, current_date + interval '10 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000008', 800, false, current_date - interval '10 days');

-- 10. Insert Contributions spread over last 90 days to populate line/bar charts beautifully
INSERT INTO public.contributions (id, contributor_id, campaign_id, amount, label, status, created_at)
VALUES
  -- 3 months ago
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', (select id from public.campaigns where title = 'Clean Water for Wayanad' limit 1), 1500, 'Clean Water Support', 'success', now() - interval '85 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', (select id from public.campaigns where title = 'School Kit Fund' limit 1), 2000, 'School Kit Contribution', 'success', now() - interval '80 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', null, 1000, 'Monthly Contribution', 'success', now() - interval '75 days'),

  -- 2 months ago
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', (select id from public.campaigns where title = 'Clean Water for Wayanad' limit 1), 1500, 'Clean Water Support', 'success', now() - interval '55 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', (select id from public.campaigns where title = 'School Kit Fund' limit 1), 2000, 'School Kit Contribution', 'success', now() - interval '50 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', null, 1000, 'Monthly Contribution', 'success', now() - interval '45 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', (select id from public.campaigns where title = 'Winter Blanket Distribution Drive' limit 1), 500, 'Winter Blanket Drive Support', 'success', now() - interval '40 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', (select id from public.campaigns where title = 'Elder Care Nutrition Program' limit 1), 3000, 'Elder Care Nutrition support', 'success', now() - interval '35 days'),

  -- 1 month ago
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', (select id from public.campaigns where title = 'Clean Water for Wayanad' limit 1), 1500, 'Clean Water Support', 'success', now() - interval '25 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', (select id from public.campaigns where title = 'School Kit Fund' limit 1), 2000, 'School Kit Contribution', 'success', now() - interval '20 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', null, 1000, 'Monthly Contribution', 'success', now() - interval '18 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', (select id from public.campaigns where title = 'Winter Blanket Distribution Drive' limit 1), 500, 'Winter Blanket Drive Support', 'success', now() - interval '15 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', (select id from public.campaigns where title = 'Elder Care Nutrition Program' limit 1), 3000, 'Elder Care Nutrition support', 'success', now() - interval '12 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', (select id from public.campaigns where title = 'Flood Relief — Wayanad' limit 1), 1500, 'Flood Relief Wayanad', 'success', now() - interval '10 days'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000007', (select id from public.campaigns where title = 'Girl Child Education Fund' limit 1), 1200, 'Education Fund Donation', 'success', now() - interval '5 days');
