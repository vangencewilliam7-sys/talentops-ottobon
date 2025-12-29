-- ============================================
-- ROLE-BASED PROJECT SETUP FOR TESTING
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: View current project memberships for Pavan
SELECT 
    pm.id as membership_id,
    p.name as project_name,
    pm.role as current_role,
    prof.full_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles prof ON pm.user_id = prof.id
WHERE prof.full_name ILIKE '%pavan%';

-- STEP 2: Make Pavan a MANAGER in TalentOps
UPDATE project_members 
SET role = 'manager' 
WHERE user_id = (SELECT id FROM profiles WHERE full_name ILIKE '%pavan%')
AND project_id = (SELECT id FROM projects WHERE name = 'TalentOps');

-- STEP 3: Make Pavan a TEAM_LEAD in Janmasethu
UPDATE project_members 
SET role = 'team_lead' 
WHERE user_id = (SELECT id FROM profiles WHERE full_name ILIKE '%pavan%')
AND project_id = (SELECT id FROM projects WHERE name = 'Janmasethu');

-- STEP 4: Optionally add Pavan to a third project as EMPLOYEE
-- First check if there are more projects
SELECT id, name FROM projects WHERE name NOT IN ('TalentOps', 'Janmasethu');

-- If you have a third project, add Pavan as employee:
-- INSERT INTO project_members (project_id, user_id, role)
-- SELECT 
--     (SELECT id FROM projects WHERE name = 'YOUR_THIRD_PROJECT'),
--     (SELECT id FROM profiles WHERE full_name ILIKE '%pavan%'),
--     'employee'
-- ON CONFLICT (project_id, user_id) DO NOTHING;

-- STEP 5: Verify the updated roles
SELECT 
    p.name as project_name,
    pm.role as role,
    CASE pm.role 
        WHEN 'manager' THEN '🔴 Manager'
        WHEN 'team_lead' THEN '🟡 Team Lead'
        WHEN 'employee' THEN '🟢 Employee'
    END as role_display
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = (SELECT id FROM profiles WHERE full_name ILIKE '%pavan%');

-- Expected Result:
-- | project_name | role      | role_display     |
-- |--------------|-----------|------------------|
-- | TalentOps    | manager   | 🔴 Manager       |
-- | Janmasethu   | team_lead | 🟡 Team Lead     |
