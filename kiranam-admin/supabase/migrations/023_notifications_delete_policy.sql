-- notifications had select_own_or_admin, update_own_or_admin, and insert
-- policies, but no delete policy at all — RLS defaults to deny, so a
-- contributor's own "Delete All" (AppContext.deleteAllNotifications)
-- silently affected zero rows (no error, since RLS filters rows rather
-- than rejecting the statement) and the notifications reappeared on the
-- very next refresh, since they were never actually removed.

create policy notifications_delete_own_or_admin
  on public.notifications
  for delete
  using (profile_id = auth.uid() or is_admin());
