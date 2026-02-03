-- Add poll columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_poll BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_options JSONB; -- Store options as an array of strings
ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_question TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS allow_multiple_answers BOOLEAN DEFAULT FALSE;

-- Fix the check constraint on message_type to allow 'poll'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check CHECK (message_type IN ('chat', 'poll', 'system', 'announcement'));

-- Create poll_votes table
DROP TABLE IF EXISTS poll_votes; -- Drop and recreate to fix relationship
CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, option_index)
);

-- Enable RLS
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies for poll_votes
DROP POLICY IF EXISTS "Users can view poll votes" ON poll_votes;
CREATE POLICY "Users can view poll votes" ON poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote" ON poll_votes;
CREATE POLICY "Users can vote" ON poll_votes FOR ALL USING (auth.uid() = user_id);

-- Enable Realtime for poll_votes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'poll_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
  END IF;
END $$;
ALTER TABLE poll_votes REPLICA IDENTITY FULL;
