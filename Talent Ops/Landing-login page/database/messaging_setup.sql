-- =====================================================
-- TalentOps Messaging System - Complete Database Setup
-- =====================================================
-- 🚨 RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Paste this entire script and click "Run"
-- =====================================================

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    type TEXT NOT NULL CHECK (type IN ('dm', 'team', 'everyone')),
    name TEXT,
    team_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Conversation Members Table
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 3. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT DEFAULT 'human' CHECK (sender_type IN ('human', 'bot', 'system')),
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'task', 'approval', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Conversation Indexes Table (for last message preview)
CREATE TABLE IF NOT EXISTS conversation_indexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_indexes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Conversations: Users can read conversations they're a member of
DROP POLICY IF EXISTS "Users can read their conversations" ON conversations;
CREATE POLICY "Users can read their conversations" ON conversations
    FOR SELECT TO authenticated USING (
        id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
    );

-- Conversations: Users can create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT TO authenticated WITH CHECK (true);

-- Conversations: Users can update their conversations
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE TO authenticated USING (
        id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
    );

-- Conversation Members: All authenticated users can read
DROP POLICY IF EXISTS "Users can read conversation members" ON conversation_members;
CREATE POLICY "Users can read conversation members" ON conversation_members
    FOR SELECT TO authenticated USING (true);

-- Conversation Members: Users can join conversations
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_members;
CREATE POLICY "Users can join conversations" ON conversation_members
    FOR INSERT TO authenticated WITH CHECK (true);

-- Messages: Users can read messages in their conversations
DROP POLICY IF EXISTS "Users can read messages" ON messages;
CREATE POLICY "Users can read messages" ON messages
    FOR SELECT TO authenticated USING (
        conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
    );

-- Messages: Users can send messages to their conversations
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT TO authenticated WITH CHECK (
        conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
    );

-- Attachments: Users can read attachments
DROP POLICY IF EXISTS "Users can read attachments" ON attachments;
CREATE POLICY "Users can read attachments" ON attachments
    FOR SELECT TO authenticated USING (true);

-- Attachments: Users can create attachments
DROP POLICY IF EXISTS "Users can create attachments" ON attachments;
CREATE POLICY "Users can create attachments" ON attachments
    FOR INSERT TO authenticated WITH CHECK (true);

-- Conversation Indexes: Users can read/write
DROP POLICY IF EXISTS "Users can manage conversation indexes" ON conversation_indexes;
CREATE POLICY "Users can manage conversation indexes" ON conversation_indexes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);

-- =====================================================
-- CREATE STORAGE BUCKET FOR ATTACHMENTS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for uploads
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments');

-- Storage policy for downloads
DROP POLICY IF EXISTS "Anyone can read attachments" ON storage.objects;
CREATE POLICY "Anyone can read attachments" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'message-attachments');

-- =====================================================
-- ✅ SETUP COMPLETE!
-- =====================================================
-- After running this script:
-- 1. Refresh your browser
-- 2. Go to Messages page
-- 3. Click "+ New DM" and select a user
-- 4. Send a message!
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ TalentOps Messaging Database Setup Complete!';
    RAISE NOTICE '📋 Tables created: conversations, conversation_members, messages, attachments, conversation_indexes';
    RAISE NOTICE '🔒 RLS policies enabled for security';
    RAISE NOTICE '📁 Storage bucket created for attachments';
END $$;
