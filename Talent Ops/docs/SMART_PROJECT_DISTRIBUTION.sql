-- ============================================
-- SMART PROJECT MEMBER DISTRIBUTION
-- Run this step-by-step in Supabase SQL Editor
-- ============================================

-- STEP 1: First, let's see what teams exist
SELECT id, team_name, manager_id FROM teams;

-- STEP 2: See all employees with their teams
SELECT 
    p.id as user_id,
    p.full_name,
    p.role,
    p.team_id,
    t.team_name
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
ORDER BY t.team_name, p.full_name;

-- STEP 3: See what projects we have
SELECT id, name FROM projects;

-- ============================================
-- STEP 4: CLEAR existing assignments and reassign properly
-- ============================================

-- Clear all existing project members
DELETE FROM project_members;

-- ============================================
-- STEP 5: Assign employees to projects based on their team
-- This creates a rotation: employees are assigned to projects
-- based on their position in the list (modulo number of projects)
-- ============================================

WITH numbered_employees AS (
    SELECT 
        id as user_id,
        full_name,
        role,
        team_id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
    FROM profiles
),
numbered_projects AS (
    SELECT 
        id as project_id,
        name,
        ROW_NUMBER() OVER (ORDER BY created_at, id) as proj_num
    FROM projects
),
project_count AS (
    SELECT COUNT(*) as cnt FROM projects
)
INSERT INTO project_members (project_id, user_id, role)
SELECT 
    np.project_id,
    ne.user_id,
    CASE 
        WHEN ne.role = 'executive' THEN 'manager'
        WHEN ne.role = 'manager' THEN 'manager'
        WHEN ne.role = 'team_lead' THEN 'team_lead'
        ELSE 'employee'
    END as role
FROM numbered_employees ne
CROSS JOIN project_count pc
JOIN numbered_projects np ON np.proj_num = ((ne.row_num - 1) % pc.cnt) + 1;

-- ============================================
-- STEP 6: Verify the distribution
-- ============================================

SELECT 
    p.name as project_name,
    COUNT(pm.id) as member_count,
    STRING_AGG(prof.full_name, ', ' ORDER BY prof.full_name) as members
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN profiles prof ON pm.user_id = prof.id
GROUP BY p.id, p.name
ORDER BY p.name;
