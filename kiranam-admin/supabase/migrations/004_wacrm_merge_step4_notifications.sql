-- ============================================================
-- wacrm merge, step 4 of 4 — wacrm_notifications
--
-- Run this AFTER steps 1, 2, and 3.
--
-- wacrm's own migration 027 creates a table called `notifications`
-- ("you were assigned a conversation" CRM-internal alerts). Kiranam
-- already has a table called `notifications` for a completely
-- different purpose (donor-facing announcements: contribution/
-- campaign/system categories). Same name, unrelated concepts —
-- merging them would be actively wrong, not just extra work. This
-- creates wacrm's version under a distinct name, wacrm_notifications,
-- so both coexist without collision. Verbatim copy of 027's DDL
-- otherwise, table name (and its internal references) renamed only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wacrm_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  -- Recipient — the agent this notification is for.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'conversation_assigned'
    CHECK (type IN ('conversation_assigned')),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  -- Who triggered the notification. NULL means an automation / the
  -- system did it rather than a signed-in teammate.
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wacrm_notifications_user_created
  ON public.wacrm_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wacrm_notifications_user_unread
  ON public.wacrm_notifications(user_id)
  WHERE read_at IS NULL;

-- Full replica identity so realtime UPDATE payloads include old column
-- values (payload.old would otherwise only carry the primary key).
ALTER TABLE public.wacrm_notifications REPLICA IDENTITY FULL;

ALTER TABLE public.wacrm_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wacrm_notifications_select ON public.wacrm_notifications;
DROP POLICY IF EXISTS wacrm_notifications_update ON public.wacrm_notifications;
CREATE POLICY wacrm_notifications_select ON public.wacrm_notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY wacrm_notifications_update ON public.wacrm_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Restrict to read_at column only at the column-privilege level so
-- clients cannot overwrite title, body, or other immutable fields.
REVOKE UPDATE ON public.wacrm_notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.wacrm_notifications TO authenticated;

-- ============================================================
-- TRIGGER — notify on conversation assignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_conversation_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_name TEXT;
  v_actor_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_agent_id IS NULL THEN
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.assigned_agent_id IS NULL
       OR NEW.assigned_agent_id IS NOT DISTINCT FROM OLD.assigned_agent_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Skip self-assignment — nothing to notify the agent about.
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.assigned_agent_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(name, ''), phone) INTO v_contact_name
  FROM public.contacts WHERE id = NEW.contact_id;

  IF auth.uid() IS NOT NULL THEN
    SELECT full_name INTO v_actor_name
    FROM public.profiles WHERE user_id = auth.uid();
  END IF;

  INSERT INTO public.wacrm_notifications (
    account_id, user_id, type, conversation_id, contact_id,
    actor_user_id, title, body
  ) VALUES (
    NEW.account_id,
    NEW.assigned_agent_id,
    'conversation_assigned',
    NEW.id,
    NEW.contact_id,
    auth.uid(),
    'New conversation assigned',
    COALESCE(v_actor_name, 'Someone') || ' assigned you a conversation with '
      || COALESCE(v_contact_name, 'a contact')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a notification failure block the assignment itself.
  RAISE WARNING 'Failed to create assignment notification for conversation %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.notify_conversation_assigned() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_conversation_assigned ON public.conversations;
CREATE TRIGGER on_conversation_assigned
  AFTER INSERT OR UPDATE OF assigned_agent_id ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.notify_conversation_assigned();

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wacrm_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wacrm_notifications;
  END IF;
END $$;

-- ============================================================
-- contacts.kiranam_profile_id — the sync linkage (Phase 4)
--
-- Links a wacrm contact back to the Kiranam profile it was synced
-- from. Nullable (manually-added wacrm contacts have no Kiranam
-- origin), unique where set (one contact per Kiranam profile).
-- ============================================================
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS kiranam_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_kiranam_profile_id
  ON public.contacts(kiranam_profile_id)
  WHERE kiranam_profile_id IS NOT NULL;

-- ============================================================
-- Contributor/Volunteer -> wacrm contact auto-sync trigger
--
-- Fires on every profiles insert/update of full_name/phone/role.
-- Upserts a contacts row (under the shared "Kiranam" account) and
-- tags it Contributor/Volunteer for easy broadcast targeting. Only
-- applies to contributor/volunteer roles -- admins get comm-center
-- LOGIN access via step 2's trigger, not a contact record (they are
-- staff, not people to broadcast WhatsApp messages to).
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_profile_to_wacrm_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kiranam_account_id UUID;
  v_contact_id UUID;
  v_tag_id UUID;
  v_tag_name TEXT;
BEGIN
  IF NEW.role NOT IN ('contributor', 'volunteer') THEN
    RETURN NEW;
  END IF;
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_kiranam_account_id FROM public.accounts WHERE name = 'Kiranam' LIMIT 1;
  IF v_kiranam_account_id IS NULL THEN
    -- No wacrm account exists yet (no admin has been provisioned
    -- into wacrm yet) -- nothing to sync into.
    RETURN NEW;
  END IF;

  INSERT INTO public.contacts (account_id, user_id, phone, name, kiranam_profile_id)
  VALUES (v_kiranam_account_id, NEW.id, NEW.phone, NULLIF(NEW.full_name, ''), NEW.id)
  ON CONFLICT (kiranam_profile_id) WHERE kiranam_profile_id IS NOT NULL
  DO UPDATE SET phone = EXCLUDED.phone, name = EXCLUDED.name
  RETURNING id INTO v_contact_id;

  IF v_contact_id IS NULL THEN
    SELECT id INTO v_contact_id FROM public.contacts WHERE kiranam_profile_id = NEW.id;
  END IF;

  v_tag_name := CASE NEW.role WHEN 'contributor' THEN 'Contributor' ELSE 'Volunteer' END;
  SELECT id INTO v_tag_id FROM public.tags WHERE account_id = v_kiranam_account_id AND name = v_tag_name LIMIT 1;
  IF v_tag_id IS NULL THEN
    INSERT INTO public.tags (user_id, account_id, name) VALUES (NEW.id, v_kiranam_account_id, v_tag_name)
    RETURNING id INTO v_tag_id;
  END IF;

  INSERT INTO public.contact_tags (contact_id, tag_id)
  VALUES (v_contact_id, v_tag_id)
  ON CONFLICT (contact_id, tag_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to sync profile % to wacrm contact: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_profile_to_wacrm_contact() OWNER TO postgres;

DROP TRIGGER IF EXISTS sync_profile_to_wacrm_contact ON public.profiles;
CREATE TRIGGER sync_profile_to_wacrm_contact
  AFTER INSERT OR UPDATE OF full_name, phone, role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_wacrm_contact();

-- One-time backfill for contributors/volunteers that already exist
-- today (the trigger only fires on future changes). No-ops quietly
-- if no wacrm account exists yet (run this again after an admin has
-- been provisioned into wacrm, i.e. after step 2's backfill ran).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE role IN ('contributor', 'volunteer') LOOP
    UPDATE public.profiles SET full_name = full_name WHERE id = r.id;
  END LOOP;
END $$;
