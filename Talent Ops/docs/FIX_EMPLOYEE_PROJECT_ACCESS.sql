-- ============================================
-- FIX RLS FOR EMPLOYEE ACCESS TO PROJECT_MEMBERS
-- Run this in Supabase SQL Editor
-- ============================================

-- Check existing policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'project_members';

-- Add policy for users to read their own memberships
DROP POLICY IF EXISTS "Users can read own memberships" ON project_members;

CREATE POLICY "Users can read own memberships" ON project_members
    FOR SELECT USING (user_id = auth.uid());

-- Also ensure users can read project details for projects they're members of
DROP POLICY IF EXISTS "Members can read project details" ON projects;

CREATE POLICY "Members can read project details" ON projects
    FOR SELECT USING (
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    );

-- Verify policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename IN ('projects', 'project_members');
