-- ============================================
-- CLEANUP DUMMY PROJECTS + ADD SAMPLE MEMBERS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Delete the 3 dummy projects from the original migration script
DELETE FROM projects WHERE name IN ('Website Redesign', 'Mobile App', 'ERP Integration');

-- 2. Verify projects left
SELECT id, name FROM projects;

-- 3. Get some user IDs from profiles to use as members
-- (Run this to see available users)
SELECT id, full_name, email, role FROM profiles LIMIT 10;

-- ============================================
-- AFTER RUNNING THE ABOVE, COPY USER IDS AND RUN THIS:
-- Replace 'PROJECT_ID' with actual project id from step 2
-- Replace 'USER_ID' with actual user id from step 3
-- ============================================

-- Example: Add members to TalentOps project
-- INSERT INTO project_members (project_id, user_id, role) VALUES
--     ('paste-talentops-project-id-here', 'paste-user-id-here', 'manager'),
--     ('paste-talentops-project-id-here', 'paste-another-user-id', 'employee');

-- ============================================
-- ALTERNATIVELY: Auto-add all employees to a project
-- This will add ALL profiles as members to a specific project
-- Replace 'YOUR_PROJECT_ID' with the actual UUID
-- ============================================

-- INSERT INTO project_members (project_id, user_id, role)
-- SELECT 
--     'YOUR_PROJECT_ID'::uuid,
--     id,
--     CASE 
--         WHEN role = 'executive' THEN 'manager'
--         WHEN role = 'manager' THEN 'manager'
--         WHEN role = 'team_lead' THEN 'team_lead'
--         ELSE 'employee'
--     END
-- FROM profiles
-- ON CONFLICT (project_id, user_id) DO NOTHING;
