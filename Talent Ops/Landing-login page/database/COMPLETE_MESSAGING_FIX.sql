-- =====================================================
-- TalentOps Messaging - COMPLETE FIX
-- =====================================================
-- 🚨 RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- This will fix ALL the constraint issues
-- =====================================================

-- STEP 1: Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_indexes CASCADE;
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- STEP 2: Recreate tables with correct schema (NO org_id NOT NULL constraints)

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,  -- NULLABLE
    type TEXT NOT NULL CHECK (type IN ('dm', 'team', 'everyone')),
    name TEXT,
    team_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation members table (NO org_id column at all)
CREATE TABLE conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT DEFAULT 'human' CHECK (sender_type IN ('human', 'bot', 'system')),
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'task', 'approval', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation indexes table (for last message preview)
CREATE TABLE conversation_indexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_indexes ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create PERMISSIVE policies (allow all for authenticated users)
CREATE POLICY "Allow all on conversations" ON conversations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on conversation_members" ON conversation_members
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on messages" ON messages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on attachments" ON attachments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on conversation_indexes" ON conversation_indexes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STEP 5: Create indexes for performance
CREATE INDEX idx_conversations_org ON conversations(org_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX idx_conv_members_conv ON conversation_members(conversation_id);
CREATE INDEX idx_messages_conv ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- STEP 6: Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Anyone can read attachments" ON storage.objects;
CREATE POLICY "Anyone can read attachments" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'message-attachments');

-- =====================================================
-- ✅ COMPLETE! All tables recreated with correct schema
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ✅ ✅ MESSAGING DATABASE FIXED! ✅ ✅ ✅';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tables created:';
    RAISE NOTICE '   - conversations (org_id is now NULLABLE)';
    RAISE NOTICE '   - conversation_members (NO org_id column)';
    RAISE NOTICE '   - messages';
    RAISE NOTICE '   - attachments';
    RAISE NOTICE '   - conversation_indexes';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS policies: ENABLED (permissive for development)';
    RAISE NOTICE '📁 Storage bucket: message-attachments';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 NOW: Hard refresh your browser (Ctrl+Shift+R) and try again!';
END $$;
