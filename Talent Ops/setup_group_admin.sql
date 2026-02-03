-- ============================================
-- Group Admin Functionality Setup
-- ============================================
-- This script adds admin functionality to team conversations
-- Run this in your Supabase SQL Editor

-- 1. Add is_admin column to conversation_members table
ALTER TABLE conversation_members 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Add created_by column to conversations table to track creator
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 3. Update existing team conversations to set creator as admin
-- This is a one-time migration for existing data
UPDATE conversation_members cm
SET is_admin = TRUE
FROM conversations c
WHERE cm.conversation_id = c.id
  AND c.type = 'team'
  AND c.created_by IS NOT NULL
  AND cm.user_id = c.created_by;

-- 4. Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_conversation_members_admin 
ON conversation_members(conversation_id, is_admin) 
WHERE is_admin = TRUE;

-- 5. Add RLS policies for admin operations

-- Policy: Only admins can add members to team conversations
CREATE POLICY "Admins can add members to team conversations"
ON conversation_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_members cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = TRUE
      AND c.type = 'team'
  )
  OR
  -- Allow initial member addition during conversation creation
  NOT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conversation_members.conversation_id
  )
);

-- Policy: Only admins can remove members from team conversations
CREATE POLICY "Admins can remove members from team conversations"
ON conversation_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversation_members cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = TRUE
      AND c.type = 'team'
  )
);

-- Policy: Only admins can update member roles (make others admin)
CREATE POLICY "Admins can update member roles"
ON conversation_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_members cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = TRUE
      AND c.type = 'team'
  )
);

-- Policy: Only admins can update team conversation details (rename, etc.)
CREATE POLICY "Admins can update team conversations"
ON conversations
FOR UPDATE
USING (
  type = 'team' AND
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
      AND is_admin = TRUE
  )
);

-- Policy: Only admins can delete team conversations
CREATE POLICY "Admins can delete team conversations"
ON conversations
FOR DELETE
USING (
  type = 'team' AND
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
      AND is_admin = TRUE
  )
);

-- 6. Create a function to check if user is admin of a conversation
CREATE OR REPLACE FUNCTION is_conversation_admin(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
      AND is_admin = TRUE
  );
END;
$$;

-- 7. Create a function to get all admins of a conversation
CREATE OR REPLACE FUNCTION get_conversation_admins(p_conversation_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name
  FROM conversation_members cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.conversation_id = p_conversation_id
    AND cm.is_admin = TRUE;
END;
$$;

-- 8. Add comment for documentation
COMMENT ON COLUMN conversation_members.is_admin IS 'Indicates if the user is an admin of this conversation (can add/remove members, rename group, delete group)';
COMMENT ON COLUMN conversations.created_by IS 'User who created this conversation (automatically becomes admin for team conversations)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Group admin functionality has been successfully set up!';
  RAISE NOTICE 'Creators of team conversations are now admins with the following powers:';
  RAISE NOTICE '  - Add new members';
  RAISE NOTICE '  - Make other members admins';
  RAISE NOTICE '  - Remove members';
  RAISE NOTICE '  - Rename the group';
  RAISE NOTICE '  - Delete the group';
END $$;
