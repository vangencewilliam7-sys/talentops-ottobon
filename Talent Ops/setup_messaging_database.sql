-- ============================================
-- MESSAGING SYSTEM DATABASE SETUP
-- ============================================

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    type TEXT NOT NULL CHECK (type IN ('dm', 'team', 'everyone')),
    name TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 2. Create conversation members table
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES auth.users(id),
    sender_type TEXT DEFAULT 'human',
    message_type TEXT DEFAULT 'chat',
    content TEXT,
    reply_to UUID REFERENCES messages(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_for UUID[], -- Array of user IDs who deleted this message for themselves
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- 5. Create conversation_indexes table (for performance)
CREATE TABLE IF NOT EXISTS conversation_indexes (
    conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversation_indexes ENABLE ROW LEVEL SECURITY;

-- 6. Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- 7. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_name TEXT,
    type TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- CONVERSATIONS POLICIES
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON conversations;
CREATE POLICY "Users can view conversations they are members of"
ON conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_members
        WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
    )
    OR type = 'everyone' -- Access to public rooms
);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update team conversations" ON conversations;
CREATE POLICY "Admins can update team conversations"
ON conversations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM conversation_members
        WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
        AND is_admin = TRUE
    )
);

-- CONVERSATION MEMBERS POLICIES
DROP POLICY IF EXISTS "Users can view members of their conversations" ON conversation_members;
CREATE POLICY "Users can view members of their conversations"
ON conversation_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can add members" ON conversation_members;
CREATE POLICY "Users can add members"
ON conversation_members FOR INSERT
WITH CHECK (
    -- User adding themselves (joining)
    user_id = auth.uid() OR
    -- Admin adding others
    EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()
        AND cm.is_admin = TRUE
    ) OR
    -- Auto-adding members when creating a conversation
    NOT EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_members.conversation_id
    ) OR 
    (
       SELECT count(*) FROM conversation_members WHERE conversation_id = conversation_members.conversation_id
    ) < 2 -- Allow initial setup
);

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_members
        WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
CREATE POLICY "Users can insert messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_user_id AND
    EXISTS (
        SELECT 1 FROM conversation_members
        WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (auth.uid() = sender_user_id);

-- CONVERSATION INDEXES POLICIES
DROP POLICY IF EXISTS "Everyone can view indexes" ON conversation_indexes;
CREATE POLICY "Everyone can view indexes"
ON conversation_indexes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can update indexes" ON conversation_indexes;
CREATE POLICY "Authenticated users can update indexes"
ON conversation_indexes FOR ALL
USING (auth.uid() IS NOT NULL);


-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
CREATE POLICY "Users can create notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);  -- Anyone can send a notification

-- ============================================
-- STORAGE SETUP (Run if needed)
-- ============================================
-- Note: You generally need to create the bucket 'message-attachments' in the Supabase Dashboard.
-- This SQL attempts to insert it but might fail depending on permissions or extension availability.

INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy
DROP POLICY IF EXISTS "Public View Attachments" ON storage.objects;
CREATE POLICY "Public View Attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'message-attachments' );

DROP POLICY IF EXISTS "Authenticated Upload Attachments" ON storage.objects;
CREATE POLICY "Authenticated Upload Attachments"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'message-attachments' AND auth.role() = 'authenticated' );

