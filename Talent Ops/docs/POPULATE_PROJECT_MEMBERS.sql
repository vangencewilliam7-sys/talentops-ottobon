-- ============================================
-- POPULATE PROJECT MEMBERS FROM EXISTING PROFILES
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Delete the 3 dummy projects from migration script
DELETE FROM projects WHERE name IN ('Website Redesign', 'Mobile App', 'ERP Integration');

-- Step 2: View all remaining projects
SELECT id, name FROM projects;

-- Step 3: View all profiles (employees) currently in the database
SELECT id, full_name, email, role, team_id FROM profiles;

-- Step 4: Add ALL profiles as members to ALL remaining projects
-- This assigns everyone with their profile.role mapped to project_member.role
INSERT INTO project_members (project_id, user_id, role)
SELECT 
    p.id as project_id,
    prof.id as user_id,
    CASE 
        WHEN prof.role = 'executive' THEN 'manager'
        WHEN prof.role = 'manager' THEN 'manager'
        WHEN prof.role = 'team_lead' THEN 'team_lead'
        ELSE 'employee'
    END as role
FROM projects p
CROSS JOIN profiles prof
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Step 5: Verify the members were added
SELECT 
    pm.id,
    p.name as project_name,
    prof.full_name,
    prof.email,
    pm.role as project_role
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles prof ON pm.user_id = prof.id
ORDER BY p.name, prof.full_name;
