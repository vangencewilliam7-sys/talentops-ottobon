-- ============================================
-- MULTI-PROJECT SETUP FOR TESTING
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Get Pavan's user ID
SELECT id, full_name, email, role FROM profiles WHERE full_name ILIKE '%pavan%';

-- STEP 2: Get project IDs
SELECT id, name FROM projects;

-- STEP 3: Clear Pavan's existing project assignments
DELETE FROM project_members WHERE user_id IN (
    SELECT id FROM profiles WHERE full_name ILIKE '%pavan%'
);

-- STEP 4: Add Pavan to TWO projects with DIFFERENT roles
-- Replace 'PAVAN_ID' and project IDs with actual UUIDs from steps 1 & 2

-- Example (replace with real UUIDs):
-- INSERT INTO project_members (project_id, user_id, role) VALUES
--     ('talentops-project-id', 'pavan-user-id', 'employee'),
--     ('course-platform-id', 'pavan-user-id', 'team_lead');

-- STEP 5: Verify Pavan's multi-project membership
SELECT 
    p.name as project_name,
    pm.role as project_role,
    prof.full_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles prof ON pm.user_id = prof.id
WHERE prof.full_name ILIKE '%pavan%';
