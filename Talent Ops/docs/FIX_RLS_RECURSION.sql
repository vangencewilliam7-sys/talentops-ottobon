-- ============================================
-- FIX RLS RECURSION IN PROJECT MEMBERS
-- Run this in Supabase SQL Editor to fix the 500 Error
-- ============================================

-- 1. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Managers can view project members" ON project_members;

-- 2. Create a secure function to check manager status (Bypasses RLS loop)
-- CHANGED: Use public schema instead of auth to avoid permission error
CREATE OR REPLACE FUNCTION public.is_project_manager(lookup_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs as owner, bypassing RLS recursion
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_project_manager TO authenticated;

-- 3. Re-create the policy using the function
CREATE POLICY "Managers can view project members" ON project_members
    FOR SELECT USING (
        public.is_project_manager(project_id)
    );

-- 4. Verify/Re-apply other policies just in case (Safe to run)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
