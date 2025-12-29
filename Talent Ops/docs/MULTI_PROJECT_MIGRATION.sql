-- ============================================
-- MULTI-PROJECT ARCHITECTURE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create project_members table (role is per-project!)
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('employee', 'team_lead', 'manager')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 3. Add project_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

-- 5. RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Users can view projects they're members of
CREATE POLICY "Users can view their projects" ON projects
    FOR SELECT USING (
        id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    );

-- Users can view their own project memberships
CREATE POLICY "Users can view their memberships" ON project_members
    FOR SELECT USING (user_id = auth.uid());

-- Managers can view all members in their projects
CREATE POLICY "Managers can view project members" ON project_members
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM project_members 
            WHERE user_id = auth.uid() AND role IN ('manager', 'team_lead')
        )
    );

-- 6. Helper function to get user's projects with roles
CREATE OR REPLACE FUNCTION get_user_projects(p_user_id UUID)
RETURNS TABLE(
    project_id UUID,
    project_name TEXT,
    project_status TEXT,
    user_role TEXT,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.name as project_name,
        p.status as project_status,
        pm.role as user_role,
        pm.joined_at
    FROM projects p
    INNER JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = p_user_id
    ORDER BY pm.joined_at DESC;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_user_projects(UUID) TO authenticated;

-- 7. Insert sample projects for testing
INSERT INTO projects (name, description, status) VALUES
    ('Website Redesign', 'Company website overhaul project', 'active'),
    ('Mobile App', 'iOS and Android app development', 'active'),
    ('ERP Integration', 'SAP ERP integration project', 'active')
ON CONFLICT DO NOTHING;

-- Note: Run this after creating projects to add members
-- Replace the UUIDs with actual user IDs from your profiles table
-- 
-- Example:
-- INSERT INTO project_members (project_id, user_id, role) VALUES
--     ('project-uuid', 'user-uuid', 'manager'),
--     ('project-uuid', 'user-uuid', 'employee');
