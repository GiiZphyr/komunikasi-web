-- =========================================================
-- KOMUNIKASI WEB
-- DATABASE SCHEMA - SUPABASE POSTGRESQL
-- PHASE 3
-- =========================================================


-- =========================================================
-- 1. EXTENSION
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =========================================================
-- 2. PROFILES
-- Terhubung dengan auth.users milik Supabase
-- =========================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    username TEXT UNIQUE,

    display_name TEXT,

    bio TEXT,

    avatar_url TEXT,

    phone TEXT,

    theme TEXT NOT NULL DEFAULT 'system'
        CHECK (theme IN ('light', 'dark', 'system')),

    last_seen TIMESTAMPTZ,

    location_lat DOUBLE PRECISION
        CHECK (location_lat >= -90 AND location_lat <= 90),

    location_lng DOUBLE PRECISION
        CHECK (location_lng >= -180 AND location_lng <= 180),

    location_privacy BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 3. CONTACTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    contact_user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_contact
        UNIQUE (owner_id, contact_user_id),

    CONSTRAINT cannot_add_self
        CHECK (owner_id <> contact_user_id)
);


-- =========================================================
-- 4. CONVERSATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    type TEXT NOT NULL
        CHECK (type IN ('private', 'group')),

    name TEXT,

    avatar_url TEXT,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 5. CONVERSATION MEMBERS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member')),

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_read_message_id UUID,

    CONSTRAINT unique_conversation_member
        UNIQUE (conversation_id, user_id)
);


-- =========================================================
-- 6. MESSAGES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    sender_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL DEFAULT 'text'
        CHECK (
            type IN (
                'text',
                'image',
                'video',
                'file',
                'audio',
                'system'
            )
        ),

    content TEXT,

    reply_to UUID
        REFERENCES public.messages(id)
        ON DELETE SET NULL,

    is_edited BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ
);


-- =========================================================
-- 7. FK last_read_message_id
-- =========================================================

ALTER TABLE public.conversation_members
DROP CONSTRAINT IF EXISTS fk_last_read_message;

ALTER TABLE public.conversation_members
ADD CONSTRAINT fk_last_read_message
FOREIGN KEY (last_read_message_id)
REFERENCES public.messages(id)
ON DELETE SET NULL;


-- =========================================================
-- 8. MESSAGE ATTACHMENTS
-- Metadata file yang disimpan di Supabase Storage
-- =========================================================

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.messages(id)
        ON DELETE CASCADE,

    file_name TEXT NOT NULL,

    file_path TEXT NOT NULL,

    mime_type TEXT,

    size_bytes BIGINT,

    thumbnail_path TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 9. STATUSES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL
        CHECK (type IN ('text', 'image', 'video')),

    content TEXT,

    media_path TEXT,

    visibility TEXT NOT NULL DEFAULT 'friends'
        CHECK (visibility IN ('friends', 'public')),

    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (NOW() + INTERVAL '24 hours'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 10. STATUS VIEWS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.status_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    status_id UUID NOT NULL
        REFERENCES public.statuses(id)
        ON DELETE CASCADE,

    viewer_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_status_view
        UNIQUE (status_id, viewer_id)
);


-- =========================================================
-- 11. CALLS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID
        REFERENCES public.conversations(id)
        ON DELETE SET NULL,

    caller_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    receiver_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    call_type TEXT NOT NULL DEFAULT 'voice'
        CHECK (call_type IN ('voice', 'video')),

    status TEXT NOT NULL DEFAULT 'calling'
        CHECK (
            status IN (
                'calling',
                'accepted',
                'rejected',
                'missed',
                'ended'
            )
        ),

    started_at TIMESTAMPTZ,

    ended_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT caller_cannot_be_receiver
        CHECK (caller_id <> receiver_id)
);


-- =========================================================
-- 12. LOGIN HISTORY
-- Hanya backend/service yang nantinya mengisi tabel ini
-- =========================================================

CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    method TEXT,

    user_agent TEXT,

    ip INET,

    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    logout_at TIMESTAMPTZ
);


-- =========================================================
-- 13. NOTIFICATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    type TEXT,

    title TEXT,

    body TEXT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    ref_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 14. BLOCKS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    blocker_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    blocked_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_block
        UNIQUE (blocker_id, blocked_id),

    CONSTRAINT cannot_block_self
        CHECK (blocker_id <> blocked_id)
);


-- =========================================================
-- 15. REPORTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reporter_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    target_user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    target_message_id UUID
        REFERENCES public.messages(id)
        ON DELETE SET NULL,

    reason TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT report_must_have_target
        CHECK (
            target_user_id IS NOT NULL
            OR target_message_id IS NOT NULL
        )
);


-- =========================================================
-- 16. INDEX
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_contacts_owner
ON public.contacts(owner_id);

CREATE INDEX IF NOT EXISTS idx_contacts_contact_user
ON public.contacts(contact_user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation
ON public.conversation_members(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
ON public.conversation_members(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
ON public.message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_statuses_user_expires
ON public.statuses(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_statuses_visibility_expires
ON public.statuses(visibility, expires_at);

CREATE INDEX IF NOT EXISTS idx_status_views_status
ON public.status_views(status_id);

CREATE INDEX IF NOT EXISTS idx_calls_conversation
ON public.calls(conversation_id);

CREATE INDEX IF NOT EXISTS idx_calls_caller
ON public.calls(caller_id);

CREATE INDEX IF NOT EXISTS idx_calls_receiver
ON public.calls(receiver_id);

CREATE INDEX IF NOT EXISTS idx_login_history_user
ON public.login_history(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker
ON public.blocks(blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked
ON public.blocks(blocked_id);

CREATE INDEX IF NOT EXISTS idx_reports_reporter
ON public.reports(reporter_id);


-- =========================================================
-- 17. HELPER FUNCTION
-- Mengecek apakah user yang sedang login adalah member
-- sebuah conversation.
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_conversation_member(
    p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
          AND user_id = auth.uid()
    );
$$;


-- =========================================================
-- 18. HELPER FUNCTION
-- Mengecek apakah user yang sedang login adalah creator
-- sebuah conversation.
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_conversation_owner(
    p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversations
        WHERE id = p_conversation_id
          AND created_by = auth.uid()
    );
$$;


-- =========================================================
-- 19. TRIGGER AUTO PROFILE
-- Ketika user baru mendaftar di Supabase Auth,
-- otomatis dibuat row di profiles.
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    INSERT INTO public.profiles (
        id,
        display_name
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data ->> 'display_name',
            split_part(COALESCE(NEW.email, ''), '@', 1),
            'User'
        )
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;

END;
$$;


-- =========================================================
-- 20. TRIGGER AUTH USER
-- =========================================================

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- =========================================================
-- 21. ENABLE RLS
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- 22. REMOVE OLD POLICIES
-- Membuat schema aman dijalankan ulang
-- =========================================================

DROP POLICY IF EXISTS "profiles_select_own"
ON public.profiles;

DROP POLICY IF EXISTS "profiles_insert_own"
ON public.profiles;

DROP POLICY IF EXISTS "profiles_update_own"
ON public.profiles;


DROP POLICY IF EXISTS "contacts_select_own"
ON public.contacts;

DROP POLICY IF EXISTS "contacts_insert_own"
ON public.contacts;

DROP POLICY IF EXISTS "contacts_update_own"
ON public.contacts;

DROP POLICY IF EXISTS "contacts_delete_own"
ON public.contacts;


DROP POLICY IF EXISTS "conversations_select_member"
ON public.conversations;

DROP POLICY IF EXISTS "conversations_insert_owner"
ON public.conversations;

DROP POLICY IF EXISTS "conversations_update_owner"
ON public.conversations;

DROP POLICY IF EXISTS "conversations_delete_owner"
ON public.conversations;


DROP POLICY IF EXISTS "members_select_member"
ON public.conversation_members;

DROP POLICY IF EXISTS "members_insert_member_or_owner"
ON public.conversation_members;

DROP POLICY IF EXISTS "members_update_member_or_owner"
ON public.conversation_members;

DROP POLICY IF EXISTS "members_delete_member_or_owner"
ON public.conversation_members;


DROP POLICY IF EXISTS "messages_select_member"
ON public.messages;

DROP POLICY IF EXISTS "messages_insert_sender"
ON public.messages;

DROP POLICY IF EXISTS "messages_update_sender"
ON public.messages;

DROP POLICY IF EXISTS "messages_delete_sender"
ON public.messages;


DROP POLICY IF EXISTS "attachments_select_member"
ON public.message_attachments;

DROP POLICY IF EXISTS "attachments_insert_sender"
ON public.message_attachments;

DROP POLICY IF EXISTS "attachments_delete_sender"
ON public.message_attachments;


DROP POLICY IF EXISTS "statuses_select_own"
ON public.statuses;

DROP POLICY IF EXISTS "statuses_insert_own"
ON public.statuses;

DROP POLICY IF EXISTS "statuses_update_own"
ON public.statuses;

DROP POLICY IF EXISTS "statuses_delete_own"
ON public.statuses;


DROP POLICY IF EXISTS "status_views_select"
ON public.status_views;

DROP POLICY IF EXISTS "status_views_insert"
ON public.status_views;

DROP POLICY IF EXISTS "status_views_delete_own"
ON public.status_views;


DROP POLICY IF EXISTS "calls_select_participant"
ON public.calls;

DROP POLICY IF EXISTS "calls_insert_caller"
ON public.calls;


DROP POLICY IF EXISTS "notifications_select_own"
ON public.notifications;

DROP POLICY IF EXISTS "notifications_update_own"
ON public.notifications;


DROP POLICY IF EXISTS "blocks_select_own"
ON public.blocks;

DROP POLICY IF EXISTS "blocks_insert_own"
ON public.blocks;

DROP POLICY IF EXISTS "blocks_delete_own"
ON public.blocks;


DROP POLICY IF EXISTS "reports_select_own"
ON public.reports;

DROP POLICY IF EXISTS "reports_insert_own"
ON public.reports;


-- =========================================================
-- 23. PROFILES POLICIES
-- Hanya profile sendiri untuk sekarang.
-- Pencarian public profile kita buat dengan mekanisme
-- khusus pada phase berikutnya agar phone/location aman.
-- =========================================================

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = id
);

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = id
);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = id
)
WITH CHECK (
    (SELECT auth.uid()) = id
);


-- =========================================================
-- 24. CONTACTS POLICIES
-- =========================================================

CREATE POLICY "contacts_select_own"
ON public.contacts
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = owner_id
);

CREATE POLICY "contacts_insert_own"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = owner_id
);

CREATE POLICY "contacts_update_own"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = owner_id
)
WITH CHECK (
    (SELECT auth.uid()) = owner_id
);

CREATE POLICY "contacts_delete_own"
ON public.contacts
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = owner_id
);


-- =========================================================
-- 25. CONVERSATIONS POLICIES
-- =========================================================

CREATE POLICY "conversations_select_member"
ON public.conversations
FOR SELECT
TO authenticated
USING (
    public.is_conversation_member(id)
);

CREATE POLICY "conversations_insert_owner"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = created_by
);

CREATE POLICY "conversations_update_owner"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = created_by
)
WITH CHECK (
    (SELECT auth.uid()) = created_by
);

CREATE POLICY "conversations_delete_owner"
ON public.conversations
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = created_by
);


-- =========================================================
-- 26. CONVERSATION MEMBERS POLICIES
-- =========================================================

CREATE POLICY "members_select_member"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
    public.is_conversation_member(conversation_id)
);

CREATE POLICY "members_insert_member_or_owner"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
    (
        (SELECT auth.uid()) = user_id
    )
    OR
    public.is_conversation_owner(conversation_id)
);

CREATE POLICY "members_update_member_or_owner"
ON public.conversation_members
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
    OR
    public.is_conversation_owner(conversation_id)
)
WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR
    public.is_conversation_owner(conversation_id)
);

CREATE POLICY "members_delete_member_or_owner"
ON public.conversation_members
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
    OR
    public.is_conversation_owner(conversation_id)
);


-- =========================================================
-- 27. MESSAGES POLICIES
-- =========================================================

CREATE POLICY "messages_select_member"
ON public.messages
FOR SELECT
TO authenticated
USING (
    public.is_conversation_member(conversation_id)
);

CREATE POLICY "messages_insert_sender"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND
    public.is_conversation_member(conversation_id)
);

CREATE POLICY "messages_update_sender"
ON public.messages
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = sender_id
    AND
    public.is_conversation_member(conversation_id)
)
WITH CHECK (
    (SELECT auth.uid()) = sender_id
    AND
    public.is_conversation_member(conversation_id)
);

CREATE POLICY "messages_delete_sender"
ON public.messages
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = sender_id
);


-- =========================================================
-- 28. MESSAGE ATTACHMENTS POLICIES
-- =========================================================

CREATE POLICY "attachments_select_member"
ON public.message_attachments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE m.id = message_id
          AND public.is_conversation_member(m.conversation_id)
    )
);

CREATE POLICY "attachments_insert_sender"
ON public.message_attachments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE m.id = message_id
          AND m.sender_id = (SELECT auth.uid())
          AND public.is_conversation_member(m.conversation_id)
    )
);

CREATE POLICY "attachments_delete_sender"
ON public.message_attachments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE m.id = message_id
          AND m.sender_id = (SELECT auth.uid())
    )
);


-- =========================================================
-- 29. STATUS POLICIES
-- Untuk Phase 3 hanya pemilik yang boleh mengelola status.
-- Public/friends viewing ditambahkan pada phase status.
-- =========================================================

CREATE POLICY "statuses_select_own"
ON public.statuses
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
);

CREATE POLICY "statuses_insert_own"
ON public.statuses
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
);

CREATE POLICY "statuses_update_own"
ON public.statuses
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
)
WITH CHECK (
    (SELECT auth.uid()) = user_id
);

CREATE POLICY "statuses_delete_own"
ON public.statuses
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
);


-- =========================================================
-- 30. STATUS VIEWS POLICIES
-- Public status bisa dicatat sebagai view.
-- =========================================================

CREATE POLICY "status_views_select"
ON public.status_views
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = viewer_id
    OR
    EXISTS (
        SELECT 1
        FROM public.statuses s
        WHERE s.id = status_id
          AND s.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "status_views_insert"
ON public.status_views
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = viewer_id
    AND
    EXISTS (
        SELECT 1
        FROM public.statuses s
        WHERE s.id = status_id
          AND s.user_id <> (SELECT auth.uid())
          AND s.visibility = 'public'
          AND s.expires_at > NOW()
    )
);

CREATE POLICY "status_views_delete_own"
ON public.status_views
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = viewer_id
);


-- =========================================================
-- 31. CALLS POLICIES
-- =========================================================

CREATE POLICY "calls_select_participant"
ON public.calls
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = caller_id
    OR
    (SELECT auth.uid()) = receiver_id
);

CREATE POLICY "calls_insert_caller"
ON public.calls
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = caller_id
    AND
    public.is_conversation_member(conversation_id)
);


-- =========================================================
-- 32. LOGIN HISTORY
-- Tidak ada policy client.
-- Pengisian nantinya menggunakan mekanisme backend.
-- =========================================================


-- =========================================================
-- 33. NOTIFICATIONS POLICIES
-- =========================================================

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
);

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
)
WITH CHECK (
    (SELECT auth.uid()) = user_id
);


-- =========================================================
-- 34. BLOCKS POLICIES
-- =========================================================

CREATE POLICY "blocks_select_own"
ON public.blocks
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = blocker_id
);

CREATE POLICY "blocks_insert_own"
ON public.blocks
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = blocker_id
);

CREATE POLICY "blocks_delete_own"
ON public.blocks
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = blocker_id
);


-- =========================================================
-- 35. REPORTS POLICIES
-- =========================================================

CREATE POLICY "reports_select_own"
ON public.reports
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = reporter_id
);

CREATE POLICY "reports_insert_own"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = reporter_id
);


-- =========================================================
-- END OF SCHEMA
-- =========================================================