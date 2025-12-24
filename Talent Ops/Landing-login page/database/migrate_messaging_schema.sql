-- =====================================================
-- TalentOps Messaging System - Schema Migration
-- =====================================================
-- Run this if you already have existing messaging tables
-- This will ADD missing columns without dropping data
-- =====================================================

-- Add missing columns to conversations table (if not exists)
DO $$ 
BEGIN
    -- Add 'name' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'name'
    ) THEN
        ALTER TABLE conversations ADD COLUMN name TEXT;
        RAISE NOTICE '✅ Added name column to conversations table';
    ELSE
        RAISE NOTICE '✓ name column already exists in conversations table';
    END IF;

    -- Add 'team_id' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE conversations ADD COLUMN team_id UUID;
        RAISE NOTICE '✅ Added team_id column to conversations table';
    ELSE
        RAISE NOTICE '✓ team_id column already exists in conversations table';
    END IF;

    -- Add 'updated_at' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to conversations table';
    ELSE
        RAISE NOTICE '✓ updated_at column already exists in conversations table';
    END IF;
END $$;

-- Add missing columns to messages table (if not exists)
DO $$ 
BEGIN
    -- Add 'sender_type' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'sender_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type TEXT DEFAULT 'human' CHECK (sender_type IN ('human', 'bot', 'system'));
        RAISE NOTICE '✅ Added sender_type column to messages table';
    ELSE
        RAISE NOTICE '✓ sender_type column already exists in messages table';
    END IF;

    -- Add 'message_type' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'task', 'approval', 'system'));
        RAISE NOTICE '✅ Added message_type column to messages table';
    ELSE
        RAISE NOTICE '✓ message_type column already exists in messages table';
    END IF;

    -- Add 'content' column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'content'
    ) THEN
        ALTER TABLE messages ADD COLUMN content TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '✅ Added content column to messages table';
    ELSE
        RAISE NOTICE '✓ content column already exists in messages table';
    END IF;
END $$;

-- Create missing tables only if they don't exist
CREATE TABLE IF NOT EXISTS orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, team_id)
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

-- Drop existing policies (if they exist) and recreate
DROP POLICY IF EXISTS "Allow authenticated users to read orgs" ON orgs;
CREATE POLICY "Allow authenticated users to read orgs" ON orgs
    FOR SELECT TO authenticated USING (true);

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

DROP POLICY IF EXISTS "Allow users to read conversation members" ON conversation_members;
CREATE POLICY "Allow users to read conversation members" ON conversation_members
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to join conversations" ON conversation_members;
CREATE POLICY "Allow users to join conversations" ON conversation_members
    FOR INSERT TO authenticated WITH CHECK (true);

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

DROP POLICY IF EXISTS "Allow users to read conversation indexes" ON conversation_indexes;
CREATE POLICY "Allow users to read conversation indexes" ON conversation_indexes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to update conversation indexes" ON conversation_indexes;
CREATE POLICY "Allow users to update conversation indexes" ON conversation_indexes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to read team memberships" ON team_memberships;
CREATE POLICY "Allow users to read team memberships" ON team_memberships
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to read user profiles" ON users;
CREATE POLICY "Allow users to read user profiles" ON users
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE TO authenticated USING (id = auth.uid());

-- =====================================================
-- STORAGE BUCKET FOR MESSAGE ATTACHMENTS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

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

INSERT INTO orgs (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'TalentOps Demo')
ON CONFLICT (id) DO NOTHING;

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
    RAISE NOTICE '✅ TalentOps Messaging System Migration Complete!';
    RAISE NOTICE '📋 All missing columns have been added';
    RAISE NOTICE '📋 RLS policies updated';
    RAISE NOTICE '📋 Ready to use!';
END $$;
