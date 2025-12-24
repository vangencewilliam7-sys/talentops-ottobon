-- =====================================================
-- FIX: Allow NULL org_id in conversations
-- =====================================================
-- 🚨 RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================

-- Remove the NOT NULL constraint from org_id column
ALTER TABLE conversations ALTER COLUMN org_id DROP NOT NULL;

-- Verify the change
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed! org_id can now be NULL';
    RAISE NOTICE '🔄 Please refresh your browser and try sending a message again!';
END $$;
