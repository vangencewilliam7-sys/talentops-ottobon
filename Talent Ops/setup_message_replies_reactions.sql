-- ============================================
-- MESSAGE REPLIES & REACTIONS FEATURE (FIXED)
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Add reply_to column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- 2. Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL, -- emoji or reaction type (e.g., '👍', '❤️', '😂', etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one reaction per user per message
    UNIQUE(message_id, user_id, reaction)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- 3. Enable RLS on message_reactions table
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for message_reactions (DROP FIRST TO PREVENT ERRORS)

DROP POLICY IF EXISTS "Users can view reactions on accessible messages" ON message_reactions;
CREATE POLICY "Users can view reactions on accessible messages"
ON message_reactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM messages m
        INNER JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can add reactions to their messages" ON message_reactions;
CREATE POLICY "Users can add reactions to their messages"
ON message_reactions
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM messages m
        INNER JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions"
ON message_reactions
FOR DELETE
USING (user_id = auth.uid());

-- 5. Create helper function to get message with reply context
CREATE OR REPLACE FUNCTION get_message_with_reply(message_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', m.id,
        'content', m.content,
        'sender_id', m.sender_user_id,
        'sender_name', p.full_name,
        'sender_email', p.email,
        'sender_avatar', p.avatar_url,
        'created_at', m.created_at,
        'reply_to', m.reply_to,
        'replied_message', (
            SELECT json_build_object(
                'id', rm.id,
                'content', rm.content,
                'sender_name', rp.full_name,
                'sender_email', rp.email
            )
            FROM messages rm
            LEFT JOIN profiles rp ON rp.id = rm.sender_user_id
            WHERE rm.id = m.reply_to
        ),
        'reactions', (
            SELECT json_agg(
                json_build_object(
                    'reaction', r.reaction,
                    'user_id', r.user_id,
                    'user_name', rp.full_name,
                    'created_at', r.created_at
                )
            )
            FROM message_reactions r
            LEFT JOIN profiles rp ON rp.id = r.user_id
            WHERE r.message_id = m.id
        )
    )
    INTO result
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_user_id
    WHERE m.id = message_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get reaction summary for a message
CREATE OR REPLACE FUNCTION get_message_reaction_summary(message_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'reaction', reaction,
                'count', count,
                'users', users
            )
        )
        FROM (
            SELECT 
                reaction,
                COUNT(*) as count,
                json_agg(
                    json_build_object(
                        'user_id', user_id,
                        'user_name', full_name
                    )
                ) as users
            FROM message_reactions mr
            LEFT JOIN profiles p ON p.id = mr.user_id
            WHERE mr.message_id = $1
            GROUP BY reaction
        ) summary
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
-- 7. Enable Realtime for message_reactions
-- This is critical for the UI to update instantly
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  END IF;
END $$;

-- Enable full replica identity so DELETE events include all columns (like message_id)
ALTER TABLE message_reactions REPLICA IDENTITY FULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Message replies and reactions setup complete!';
END $$;
