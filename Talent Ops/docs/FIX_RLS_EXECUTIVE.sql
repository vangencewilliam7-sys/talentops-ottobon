-- ============================================
-- FIX RLS FOR EXECUTIVE ACCESS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop ALL existing policies on projects and project_members to start fresh
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can view their memberships" ON project_members;
DROP POLICY IF EXISTS "Managers can view project members" ON project_members;

-- 2. Create PERMISSIVE policies that allow executives to see everything

-- Executives can view ALL projects
CREATE POLICY "Executives can view all projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'executive'
        )
    );

-- Regular users can view projects they're members of
CREATE POLICY "Members can view their projects" ON projects
    FOR SELECT USING (
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    );

-- Executives can view ALL project members
CREATE POLICY "Executives can view all members" ON project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'executive'
        )
    );

-- Regular users can view their own memberships
CREATE POLICY "Users can view own memberships" ON project_members
    FOR SELECT USING (user_id = auth.uid());

-- Managers/Team Leads can view members in their projects (using security definer function)
CREATE OR REPLACE FUNCTION public.is_project_manager(lookup_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM project_members 
    WHERE project_id = lookup_project_id 
    AND user_id = auth.uid() 
    AND role IN ('manager', 'team_lead')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_project_manager TO authenticated;

CREATE POLICY "Managers can view project members" ON project_members
    FOR SELECT USING (public.is_project_manager(project_id));

-- 3. Allow INSERT/UPDATE/DELETE for executives and managers
CREATE POLICY "Executives can manage all projects" ON projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'executive'
        )
    );

CREATE POLICY "Executives can manage all members" ON project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'executive'
        )
    );

-- 4. Ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 5. Verify: Check if there are any projects in the table
SELECT 'Projects in DB:' as info, count(*) as count FROM projects;
