-- The wacrm merge moved to account-based multi-tenancy (account_id + is_account_member())
-- for newer tables, but contacts/tags/conversations/deals/contact_tags/messages were left
-- on the old single-owner model (auth.uid() = user_id). Since the profile->contact sync
-- trigger sets user_id to the *contributor's* own id (not the admin's), every synced
-- contact was invisible to admins under the old policy despite existing in the DB.

drop policy "Users can manage own contacts" on public.contacts;
create policy "contacts_select" on public.contacts for select using (is_account_member(account_id));
create policy "contacts_insert" on public.contacts for insert with check (is_account_member(account_id, 'agent'));
create policy "contacts_update" on public.contacts for update using (is_account_member(account_id, 'agent'));
create policy "contacts_delete" on public.contacts for delete using (is_account_member(account_id, 'agent'));

drop policy "Users can manage own tags" on public.tags;
create policy "tags_select" on public.tags for select using (is_account_member(account_id));
create policy "tags_insert" on public.tags for insert with check (is_account_member(account_id, 'agent'));
create policy "tags_update" on public.tags for update using (is_account_member(account_id, 'agent'));
create policy "tags_delete" on public.tags for delete using (is_account_member(account_id, 'agent'));

drop policy "Users can manage own conversations" on public.conversations;
create policy "conversations_select" on public.conversations for select using (is_account_member(account_id));
create policy "conversations_insert" on public.conversations for insert with check (is_account_member(account_id, 'agent'));
create policy "conversations_update" on public.conversations for update using (is_account_member(account_id, 'agent'));
create policy "conversations_delete" on public.conversations for delete using (is_account_member(account_id, 'agent'));

drop policy "Users can manage own deals" on public.deals;
create policy "deals_select" on public.deals for select using (is_account_member(account_id));
create policy "deals_insert" on public.deals for insert with check (is_account_member(account_id, 'agent'));
create policy "deals_update" on public.deals for update using (is_account_member(account_id, 'agent'));
create policy "deals_delete" on public.deals for delete using (is_account_member(account_id, 'agent'));

drop policy "Users can manage contact tags" on public.contact_tags;
create policy "contact_tags_select" on public.contact_tags for select using (
  exists (select 1 from public.contacts c where c.id = contact_tags.contact_id and is_account_member(c.account_id))
);
create policy "contact_tags_insert" on public.contact_tags for insert with check (
  exists (select 1 from public.contacts c where c.id = contact_tags.contact_id and is_account_member(c.account_id, 'agent'))
);
create policy "contact_tags_delete" on public.contact_tags for delete using (
  exists (select 1 from public.contacts c where c.id = contact_tags.contact_id and is_account_member(c.account_id, 'agent'))
);

drop policy "Users can view own messages" on public.messages;
create policy "messages_select" on public.messages for select using (
  exists (select 1 from public.conversations conv where conv.id = messages.conversation_id and is_account_member(conv.account_id))
);
