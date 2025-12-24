-- =====================================================
-- TalentOps Messaging System - Database Setup
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. Create Organizations Table (if not exists)
CREATE TABLE IF NOT EXISTS orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('dm', 'team', 'everyone')),
    name TEXT,
    team_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Conversation Members Table
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 4. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT DEFAULT 'human' CHECK (sender_type IN ('human', 'bot', 'system')),
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'task', 'approval', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Attachments Table
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

-- 6. Create Conversation Indexes Table (for performance)
CREATE TABLE IF NOT EXISTS conversation_indexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Team Memberships Table (if not exists)
CREATE TABLE IF NOT EXISTS team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- 8. Create Users Table (if not exists) - Extended profile
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TEMPORARY: Allow all authenticated users (for development)
-- TODO: Replace with proper role-based policies in production
-- =====================================================

-- Orgs policies
DROP POLICY IF EXISTS "Allow authenticated users to read orgs" ON orgs;
CREATE POLICY "Allow authenticated users to read orgs" ON orgs
    FOR SELECT TO authenticated USING (true);

-- Conversations policies
DROP POLICY IF EXISTS "Allow users to read their conversations" ON conversations;
CREATE POLICY "Allow users to read their conversations" ON conversations
    FOR SELECT TO authenticated USING (
        id IN (
            SELECT conversation_id FROM conversation_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow users to create conversations" ON conversations;
CREATE POLICY "Allow users to create conversations" ON conversations
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to update their conversations" ON conversations;
CREATE POLICY "Allow users to update their conversations" ON conversations
    FOR UPDATE TO authenticated USING (
        id IN (
            SELECT conversation_id FROM conversation_members 
            WHERE user_id = auth.uid()
        )
    );

-- Conversation Members policies
DROP POLICY IF EXISTS "Allow users to read conversation members" ON conversation_members;
CREATE POLICY "Allow users to read conversation members" ON conversation_members
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to join conversations" ON conversation_members;
CREATE POLICY "Allow users to join conversations" ON conversation_members
    FOR INSERT TO authenticated WITH CHECK (true);

-- Messages policies
DROP POLICY IF EXISTS "Allow users to read messages in their conversations" ON messages;
CREATE POLICY "Allow users to read messages in their conversations" ON messages
    FOR SELECT TO authenticated USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow users to send messages" ON messages;
CREATE POLICY "Allow users to send messages" ON messages
    FOR INSERT TO authenticated WITH CHECK (
        conversation_id IN (
            SELECT conversation_id FROM conversation_members 
            WHERE user_id = auth.uid()
        )
    );

-- Attachments policies
DROP POLICY IF EXISTS "Allow users to read attachments" ON attachments;
CREATE POLICY "Allow users to read attachments" ON attachments
    FOR SELECT TO authenticated USING (
        message_id IN (
            SELECT m.id FROM messages m
            INNER JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
            WHERE cm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow users to upload attachments" ON attachments;
CREATE POLICY "Allow users to upload attachments" ON attachments
    FOR INSERT TO authenticated WITH CHECK (true);

-- Conversation Indexes policies
DROP POLICY IF EXISTS "Allow users to read conversation indexes" ON conversation_indexes;
CREATE POLICY "Allow users to read conversation indexes" ON conversation_indexes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to update conversation indexes" ON conversation_indexes;
CREATE POLICY "Allow users to update conversation indexes" ON conversation_indexes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Team Memberships policies
DROP POLICY IF EXISTS "Allow users to read team memberships" ON team_memberships;
CREATE POLICY "Allow users to read team memberships" ON team_memberships
    FOR SELECT TO authenticated USING (true);

-- Users policies
DROP POLICY IF EXISTS "Allow users to read user profiles" ON users;
CREATE POLICY "Allow users to read user profiles" ON users
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE TO authenticated USING (id = auth.uid());

-- =====================================================
-- STORAGE BUCKET FOR MESSAGE ATTACHMENTS
-- =====================================================

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Allow public to read files" ON storage.objects;
CREATE POLICY "Allow public to read files" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'message-attachments');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Create a sample organization
INSERT INTO orgs (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'TalentOps Demo')
ON CONFLICT (id) DO NOTHING;

-- Create an "Everyone" conversation for the org
INSERT INTO conversations (id, org_id, type, name)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'everyone',
    'Company Chat'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ TalentOps Messaging System Database Setup Complete!';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Verify all tables were created';
    RAISE NOTICE '   2. Check RLS policies are enabled';
    RAISE NOTICE '   3. Test the messaging system in your app';
    RAISE NOTICE '   4. Create user profiles in the users table';
END $$;
